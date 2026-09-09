<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PDO;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--disk=local} {--keep=14}';

    protected $description = 'Create a SQL/raw backup of the application database';

    public function handle(): int
    {
        $disk = $this->option('disk');
        $keep = (int) $this->option('keep');
        $connection = config('database.default');
        $driver = DB::connection()->getDriverName();

        $timestamp = now()->format('Y-m-d_His');
        $executableName = $connection . '_' . $timestamp;
        $filename = 'backups/' . $executableName . '.sql';
        $store = Storage::disk($disk);

        try {
            if ($driver === 'sqlite') {
                $databasePath = DB::connection()->getDatabaseName();
                $tempPath = storage_path('app/backups/' . $executableName . '.sql');

                if (!is_dir(dirname($tempPath))) {
                    mkdir(dirname($tempPath), 0775, true);
                }

                $pdo = DB::connection()->getPdo();
                $dump = $this->dumpSqlite($pdo);

                file_put_contents($tempPath, $dump);

                $store->put($filename, file_get_contents($tempPath));

                if (file_exists($tempPath)) {
                    unlink($tempPath);
                }
            } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
                $mysqldump = env('MYSQLDUMP_PATH', 'mysqldump');
                $command = sprintf(
                    '%s --user=%s --password=%s --host=%s %s',
                    escapeshellarg($mysqldump),
                    escapeshellarg(config('database.connections.mysql.username')),
                    escapeshellarg(config('database.connections.mysql.password')),
                    escapeshellarg(config('database.connections.mysql.host')),
                    escapeshellarg(config('database.connections.mysql.database')),
                );

                $output = shell_exec($command);
                if ($output === null || trim((string) $output) === '') {
                    $this->error('mysqldump returned no output. Is mysqldump installed?');

                    return self::FAILURE;
                }

                $store->put($filename, $output);
            } else {
                // Generic fallback: dump all tables row by row.
                $store->put($filename, $this->dumpGeneric());
            }
        } catch (\Throwable $e) {
            $this->error('Backup failed: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info('Backup saved to ' . $store->path($filename));

        $this->prune($store, $keep);

        return self::SUCCESS;
    }

    private function dumpSqlite(PDO $pdo): string
    {
        $lines = [];
        $lines[] = 'PRAGMA foreign_keys=OFF;';
        $lines[] = 'BEGIN TRANSACTION;';

        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            $create = $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name = " . $pdo->quote($table))->fetchColumn();
            if ($create) {
                $lines[] = $create . ';';
            }

            $rows = $pdo->query('SELECT * FROM ' . $this->quoteIdentifier($table) . ';')->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rows as $row) {
                $columns = implode(',', array_map(fn ($col) => '"' . $col . '"', array_keys($row)));
                $values = implode(',', array_map(fn ($value) => $value === null ? 'NULL' : $pdo->quote((string) $value), array_values($row)));
                $lines[] = 'INSERT INTO ' . $this->quoteIdentifier($table) . ' (' . $columns . ') VALUES (' . $values . ');';
            }
        }

        $lines[] = 'COMMIT;';

        return implode("\n", $lines);
    }

    private function dumpGeneric(): string
    {
        $lines = [];
        foreach (DB::select('SELECT name FROM sqlite_master WHERE type="table"') as $table) {
            $name = $table->name;
            $rows = DB::table($name)->get();
            foreach ($rows as $row) {
                $lines[] = sprintf(
                    'INSERT OR IGNORE INTO %s (%s) VALUES (%s);',
                    $name,
                    implode(',', array_keys((array) $row)),
                    implode(',', array_map(fn ($v) => is_null($v) ? 'NULL' : "'" . str_replace("'", "''", (string) $v) . "'", array_values((array) $row))),
                );
            }
        }

        return implode("\n", $lines);
    }

    private function quoteIdentifier(string $identifier): string
    {
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    private function prune($store, int $keep): void
    {
        $files = collect($store->files('backups'))
            ->filter(fn ($file) => str_ends_with($file, '.sql'))
            ->sortDesc();

        $toDelete = $files->slice($keep);

        foreach ($toDelete as $file) {
            $store->delete($file);
            $this->line('Pruned old backup: ' . $file);
        }
    }
}