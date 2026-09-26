<?php

namespace App\Services;

use App\Models\QwaWhatsappTemplate;
use App\Support\LanguageCatalog;
use App\Support\QwaTemplateIntents;
use Illuminate\Support\Str;

/**
 * Creates and reuses regional (Marathi / Hindi) custom QWA templates for the
 * canonical template intents. Regional variants keep the exact same
 * {{placeholders}} and inherit the mapping of the English master, so they
 * render identically through the fallback send-text path.
 */
class QwaRegionalTemplateService
{
    /**
     * Ensure the regional variant for an intent exists and return it
     * (creating it from the canonical translation when needed).
     *
     * @return QwaWhatsappTemplate|null  null when the intent is unknown
     */
    public function ensureRegionalVariant(int $organizationId, string $intentKey, string $language): ?QwaWhatsappTemplate
    {
        if (! in_array($language, QwaTemplateIntents::languageCodes(), true)) {
            $language = LanguageCatalog::ENGLISH;
        }

        $message = QwaTemplateIntents::message($intentKey, $language);

        if ($message === null) {
            return null;
        }

        $existing = QwaWhatsappTemplate::query()
            ->where('organization_id', $organizationId)
            ->where('variant_key', $intentKey)
            ->where('language', $language)
            ->first();

        if ($existing) {
            return $existing;
        }

        $base = QwaWhatsappTemplate::query()
            ->where('organization_id', $organizationId)
            ->where('variant_key', $intentKey)
            ->where('language', LanguageCatalog::ENGLISH)
            ->first()
            ?? QwaWhatsappTemplate::query()
                ->where('organization_id', $organizationId)
                ->where('variant_key', $intentKey)
                ->first();

        $messagePlaceholders = QwaWhatsappTemplate::parseTemplatePlaceholders(
            (string) ($message['header'] ?? ''),
            (string) $message['body'],
            (string) ($message['footer'] ?? '')
        );

        $placeholders = collect(is_array($base?->placeholders) ? $base->placeholders : [])
            ->merge($messagePlaceholders)
            ->unique()
            ->values()
            ->all();

        $mapping = is_array($base?->mapping)
            ? $base->mapping
            : [];

        $mapping = array_replace(
            QwaWhatsappTemplate::defaultMapping($placeholders),
            collect($mapping)->only($placeholders)->all()
        );

        $pretty = Str::of(QwaTemplateIntents::templateName($intentKey) ?? $intentKey)
            ->replace('_', ' ')
            ->title();

        $suffix = match ($language) {
            LanguageCatalog::MARATHI => ' मराठी',
            LanguageCatalog::HINDI => ' हिन्दी',
            default => '',
        };

        return QwaWhatsappTemplate::query()->create([
            'organization_id' => $organizationId,
            'session_id' => 'custom',
            'qwa_template_id' => null,
            'is_custom' => true,
            'language' => $language,
            'variant_key' => $intentKey,
            'name' => $pretty.$suffix,
            'body' => $message['body'],
            'header' => $message['header'] ?? null,
            'footer' => $message['footer'] ?? null,
            'media' => null,
            'placeholders' => $placeholders,
            'mapping' => $mapping,
            'action_toggles' => [],
            'last_synced_at' => now(),
        ]);
    }

    /**
     * The intent key behind a template, derived from its variant_key or from
     * its name when it is one of the canonical synced templates.
     */
    public function intentKeyFor(QwaWhatsappTemplate $template): ?string
    {
        if (filled($template->variant_key)) {
            return $template->variant_key;
        }

        return QwaTemplateIntents::keyForName((string) $template->name);
    }
}