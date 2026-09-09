<?php

namespace App\Console\Commands;

use App\Services\TranslationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class TranslateSync extends Command
{
    protected $signature = 'translate:sync
        {--keys= : Optional path to a JSON array of keys (defaults to scanning TSX files for t() calls)}
        {--targets=mr,hi : Comma-separated target locales}
        {--force : Re-translate keys that already have entries}
        {--dry-run : Report what would change without writing}';

    protected $description = 'Extract t() keys from the frontend and generate/update the i18n dictionaries (mr.ts / hi.ts) via the translation provider.';

    public function handle(TranslationService $translation): int
    {
        $keys = $this->resolveKeys();

        if (empty($keys)) {
            $this->error('No translation keys found.');

            return self::FAILURE;
        }

        $this->info(sprintf('Found %d unique keys.', count($keys)));
        $this->syncEnglish($keys);

        $targets = array_filter(array_map('trim', explode(',', (string) $this->option('targets'))));
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $untranslated = [];

        foreach ($targets as $target) {
            $path = resource_path("js/i18n/{$target}.ts");

            if (! File::exists($path)) {
                $this->warn("Dictionary {$target}.ts does not exist; creating it.");
                File::put($path, "const {$target}: Record<string, string> = {};\n\nexport default {$target};\n");
            }

            $existing = static::readDict($path);
            $toWrite = $existing;
            $countNew = 0;
            $countExisting = 0;
            $countFailed = 0;

            foreach ($keys as $key) {
                if (! $force && isset($toWrite[$key])) {
                    $countExisting++;

                    continue;
                }

                if ($dryRun) {
                    $countNew++;

                    continue;
                }

                $result = $translation->translate($key, $target, 'en');

                if ($result === '' ) {
                    continue;
                }

                $toWrite[$key] = $result;
                $countNew++;

                if ($result === $key) {
                    $countFailed++;
                    $untranslated[$target][] = $key;
                }

                usleep(250_000);
            }

            if (! $dryRun) {
                static::writeDict($path, $toWrite);
            }

            $this->info(sprintf(
                '[%s] %d new, %d existing%s%s',
                $target,
                $countNew,
                $countExisting,
                $countFailed > 0 ? ", {$countFailed} fell back to English" : '',
                $dryRun ? ' (dry run)' : ''
            ));
        }

        if (count($untranslated) > 0) {
            $this->warn('Untranslated (fell back to English); re-run with --force to retry:');
            foreach ($untranslated as $target => $keysFailed) {
                $this->warn(sprintf('  %s: %s', $target, implode(' | ', array_slice($keysFailed, 0, 20))));
            }
        }

        return self::SUCCESS;
    }

    private function resolveKeys(): array
    {
        $keysPath = $this->option('keys');

        if ($keysPath !== null) {
            if (! File::exists($keysPath)) {
                $this->error("Keys file not found: {$keysPath}");

                return [];
            }

            $keys = json_decode(File::get($keysPath), true);

            return array_values(array_filter(array_map('trim', is_array($keys) ? $keys : [])));
        }

        $keys = [];
        $dirs = [resource_path('js/Pages'), resource_path('js/components')];

        foreach ($dirs as $dir) {
            foreach (static::collectTsx($dir) as $file) {
                $source = File::get($file);
                // Match only the FIRST string argument of t()/translate() so that
                // `t('key', { param })` yields just `key`.
                if (preg_match_all('/\b(?:t|translate)\s*\(\s*(?<q>[\'"])(?<key>(?:\\\\.|(?!\k<q>)[\s\S])*)\k<q>/', $source, $matches)) {
                    foreach ($matches['key'] as $raw) {
                        $key = trim(preg_replace('/\s+/u', ' ', $raw));

                        // Reject obvious garbage (regex spans across markup/JS).
                        if ($key === '' || mb_strlen($key) > 200 || preg_match('/[<>"\'\\\\]|\R/', $key)) {
                            continue;
                        }

                        $keys[$key] = true;
                    }
                }
            }
        }

        return array_keys($keys);
    }

    private function syncEnglish(array $keys): void
    {
        $path = resource_path('js/i18n/en.ts');
        $existing = File::exists($path) ? static::readDict($path) : [];
        $toWrite = $existing;

        foreach ($keys as $key) {
            if (! isset($toWrite[$key])) {
                $toWrite[$key] = $key;
            }
        }

        if (count($toWrite) !== count($existing)) {
            static::writeDict($path, $toWrite);
            $this->info(sprintf('[en] added %d missing keys.', count($toWrite) - count($existing)));
        }
    }

    private static function collectTsx(string $dir): array
    {
        if (! File::isDirectory($dir)) {
            return [];
        }

        $files = [];

        foreach (File::allFiles($dir) as $file) {
            if ($file->getExtension() === 'tsx') {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    private static function readDict(string $path): array
    {
        if (! File::exists($path)) {
            return [];
        }

        $entries = [];
        $source = File::get($path);

        if (preg_match_all("/'((?:[^'\\\\]|\\\\.)*)'\s*:\s*'((?:[^'\\\\]|\\\\.)*)'/", $source, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $entries[stripslashes($match[1])] = stripslashes($match[2]);
            }
        }

        return $entries;
    }

    private static function writeDict(string $path, array $entries): void
    {
        ksort($entries);

        $lines = []; 

        foreach ($entries as $key => $value) {
            $lines[] = sprintf(
                "  '%s': '%s',",
                static::quote($key),
                static::quote($value)
            );
        }

        // Rebuild the file, preserving the leading `const <name>: ... = {` line only
        // when the current file already declares one; otherwise fall back to 'dict'.
        $name = 'dict';
        if (preg_match('/const\s+([A-Za-z_]\w*)\s*:\s*Record<string,\s*string>/', File::exists($path) ? File::get($path) : '', $m)) {
            $name = $m[1];
        }

        $contents = "const {$name}: Record<string, string> = {\n";
        $contents .= implode("\n", $lines);
        $contents .= "\n};\n\nexport default {$name};\n";

        File::put($path, $contents);
    }

    private static function quote(string $value): string
    {
        return addcslashes($value, "\\'");
    }
}