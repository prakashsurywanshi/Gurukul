<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RestoreDatabase extends Command
{
    protected $signature = 'backup:restore {file : Backup filename relative to backups/ (e.g. mysql_2026-09-09_000000.sql)} {--disk=local} {--yes : Skip the confirmation prompt}';

    protected $description = 'Restore the database from a SQL backup file';

    public function handle(): int
    {
        $file = $this->argument('file');
        $disk = $this->option('disk');
        $store = Storage::disk($disk);

        $path = 'backups/' . ltrim($file, '/');

        if (!$store->exists($path) || !str_ends_with($path, '.sql')) {
            $this->error('Backup file not found: ' . $file);

            return self::FAILURE;
        }

        if (!$this->option('yes') && !$this->confirm('This will overwrite the current database. Continue?')) {
            return self::FAILURE;
        }

        $driver = DB::connection()->getDriverName();
        $connection = config('database.default');

        try {
            if ($driver === 'sqlite') {
                $target = DB::connection()->getDatabaseName();

                if ($target !== ':memory:' && is_file($target)) {
                    copy($target, $target . '.pre-restore.' . date('Ymd_His'));
                }

                $sql = $store->get($path);
                $pdo = DB::connection()->getPdo();
                $pdo->exec($sql);
            } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
                $mysql = env('MYSQLDUMP_PATH', 'mysqldump');

                // The mysql client usually lives next to mysqldump.
                $restoreBinary = $this->mysqlBinary($mysql);

                $filePath = $store->path($path);
                $password = (string) config('database.connections.mysql.password');

                $command = sprintf(
                    '%s --user=%s %s --host=%s %s < %s',
                    escapeshellarg($restoreBinary),
                    escapeshellarg(config('database.connections.mysql.username')),
                    $password !== '' ? '--password=' . escapeshellarg($password) : '--password=' . escapeshellarg(''),
                    escapeshellarg(config('database.connections.mysql.host')),
                    escapeshellarg(config('database.connections.mysql.database')),
                    escapeshellarg($filePath),
                );

                shell_exec($command);
            } else {
                $this->error('Automatic restore is only supported for sqlite, mysql and mariadb connections.');

                return self::FAILURE;
            }
        } catch (\Throwable $e) {
            $this->error('Restore failed: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info('Database restored from ' . $path . ' (' . $connection . ').');

        return self::SUCCESS;
    }

    private function mysqlBinary(string $mysqldump): string
    {
        $custom = env('MYSQL_RESTORE_PATH', '');
        if ($custom !== '') {
            return $custom;
        }

        if (str_ends_with($mysqldump, 'mysqldump')) {
            return substr($mysqldump, 0, -strlen('mysqldump')) . 'mysql';
        }

        return 'mysql';
    }
}