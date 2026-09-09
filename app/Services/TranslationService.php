<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TranslationService
{
    /**
     * Translate a piece of text from English to the given target language.
     *
     * Returns the original (English) text when the target is English, when the
     * source text is empty, or when the translation provider is unavailable.
     */
    public function translate(string $text, string $targetLanguage = 'mr', string $sourceLanguage = 'en'): string
    {
        $text = trim($text);

        if ($text === '' || $targetLanguage === $sourceLanguage) {
            return $text;
        }

        $provider = config('services.translation.provider', 'mymemory');

        return match ($provider) {
            'libretranslate' => $this->translateViaLibreTranslate($text, $targetLanguage, $sourceLanguage),
            'google' => $this->translateViaGoogle($text, $targetLanguage, $sourceLanguage),
            default => $this->translateViaMyMemory($text, $targetLanguage, $sourceLanguage),
        };
    }

    private function translateViaMyMemory(string $text, string $targetLanguage, string $sourceLanguage): string
    {
        try {
            $response = Http::timeout((int) config('services.translation.timeout', 10))
                ->asForm()
                ->post('https://api.mymemory.translated.net/get', [
                    'q' => $text,
                    'langpair' => $sourceLanguage.'|'.$targetLanguage,
                    'de' => 'qgurukul@qaulity.com',
                ]);

            if ($response->failed()) {
                return $text;
            }

            $data = $response->json();
            $translated = $data['responseData']['translatedText'] ?? null;

            if (is_string($translated)) {
                // Some MyMemory matches embed translation-memory placeholders.
                $translated = preg_replace('~<\s*/?\s*(?:x|g)\s+id="[^"]*"\s*/?>~i', '', $translated);
                $translated = preg_replace('~</?\s*(?:x|g)\s*>~i', '', $translated);
                $translated = trim($translated ?? '');
            }

            if (is_string($translated) && $translated !== '' && $translated !== $text) {
                return $translated;
            }

            return $text;
        } catch (ConnectionException|Throwable $exception) {
            Log::warning('Translation provider unavailable, falling back to original text.', [
                'target' => $targetLanguage,
                'error' => $exception->getMessage(),
            ]);

            return $text;
        }
    }

    private function translateViaLibreTranslate(string $text, string $targetLanguage, string $sourceLanguage): string
    {
        try {
            $response = Http::timeout((int) config('services.translation.timeout', 10))
                ->post(config('services.translation.url', 'https://libretranslate.com/translate'), [
                    'q' => $text,
                    'source' => $sourceLanguage,
                    'target' => $targetLanguage,
                    'format' => 'text',
                ]);

            if ($response->failed()) {
                return $text;
            }

            $translated = $response->json('translatedText');

            if (is_string($translated) && $translated !== '' && $translated !== $text) {
                return $translated;
            }

            return $text;
        } catch (Throwable $exception) {
            Log::warning('LibreTranslate unavailable, falling back to original text.', [
                'target' => $targetLanguage,
                'error' => $exception->getMessage(),
            ]);

            return $text;
        }
    }

    /**
     * Cached IPv4 address for the translate host so request-time DNS lookups
     * (which are intermittently slow/unreliable in some environments) are skipped.
     */
    private static ?string $googleHostIp = null;

    private static ?float $lastResolveAttempt = null;

    private static function resolveGoogleHost(): ?string
    {
        if (self::$googleHostIp !== null && self::$googleHostIp !== '') {
            return self::$googleHostIp;
        }

        // Never cache a failed lookup, but do not re-stall on every key either:
        // re-attempt at most once per 15 seconds so a transient DNS window does
        // not pin the process to an unresponsive resolver.
        if (self::$lastResolveAttempt !== null && microtime(true) - self::$lastResolveAttempt < 15) {
            return null;
        }

        self::$lastResolveAttempt = microtime(true);

        $addresses = \gethostbynamel('translate.googleapis.com');
        $ip = is_array($addresses) ? ($addresses[0] ?? null) : null;
        self::$googleHostIp = is_string($ip) ? $ip : '';

        return self::$googleHostIp !== '' ? self::$googleHostIp : null;
    }

    private function translateViaGoogle(string $text, string $targetLanguage, string $sourceLanguage): string
    {
        try {
            $request = Http::timeout((int) config('services.translation.timeout', 10));

            $resolved = self::resolveGoogleHost();

            if ($resolved !== null) {
                $request = $request->withOptions([
                    'curl' => [CURLOPT_RESOLVE => ['translate.googleapis.com:443:'.self::$googleHostIp]],
                ]);
            }

            $response = $request->get('https://translate.googleapis.com/translate_a/single', [
                    'client' => 'gtx',
                    'dt' => 't',
                    'sl' => $sourceLanguage,
                    'tl' => $targetLanguage,
                    'q' => $text,
                ]);

            if ($response->failed()) {
                $this->noteGoogleFailure();

                return $text;
            }

            $segments = $response->json();

            if (! is_array($segments) || ! isset($segments[0][0][0])) {
                $this->noteGoogleFailure();

                return $text;
            }

            $translated = implode('', array_map(static fn (array $segment): string => (string) ($segment[0] ?? ''), $segments[0]));

            return $translated !== '' && $translated !== $text ? $translated : $text;
        } catch (Throwable $exception) {
            $this->noteGoogleFailure();

            Log::warning('Google translate unavailable, falling back to original text.', [
                'target' => $targetLanguage,
                'error' => $exception->getMessage(),
            ]);

            return $text;
        }
    }

    /**
     * Track consecutive provider failures and pause once a cluster is hit so the
     * unofficial endpoint can recover from temporary throttling/DNS flakiness
     * instead of grinding through every subsequent request.
     */
    private static int $googleFailures = 0;

    private function noteGoogleFailure(): void
    {
        self::$googleFailures++;

        if (self::$googleFailures >= 3) {
            sleep(30);
            self::$googleFailures = 1;
        }
    }

}
