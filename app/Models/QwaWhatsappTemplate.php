<?php

namespace App\Models;

use App\Support\LanguageCatalog;
use App\Support\TemplateCatalog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QwaWhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'session_id',
        'qwa_template_id',
        'name',
        'body',
        'header',
        'footer',
        'media',
        'placeholders',
        'mapping',
        'action_toggles',
        'is_custom',
        'language',
        'variant_key',
        'last_synced_at',
    ];

    protected $casts = [
        'media' => 'array',
        'placeholders' => 'array',
        'mapping' => 'array',
        'action_toggles' => 'array',
        'is_custom' => 'boolean',
        'last_synced_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * The sibling template for the same variant group (same variant_key) in
     * the requested language for this organization. Returns the template
     * itself when the requested language matches its own. Returns null when
     * the template has no variant_key or no regional variant exists.
     */
    public function variantFor(string $language): ?self
    {
        $language = LanguageCatalog::isValidCode($language) ? $language : LanguageCatalog::ENGLISH;

        if (filled($this->variant_key) && filled($this->organization_id)) {
            $candidate = static::query()
                ->where('organization_id', $this->organization_id)
                ->where('variant_key', $this->variant_key)
                ->where('language', $language)
                ->first();

            if ($candidate) {
                return $candidate;
            }
        }

        return $this->language === $language ? $this : null;
    }

    /**
     * The existing regional variants (including the template itself when
     * grouped) as a language-to-template map keyed by language code.
     *
     * @return array<string, self>
     */
    public function variants(): array
    {
        if (! filled($this->variant_key) || ! filled($this->organization_id)) {
            return [];
        }

        return static::query()
            ->where('organization_id', $this->organization_id)
            ->where('variant_key', $this->variant_key)
            ->get()
            ->keyBy(fn (self $template) => $template->language)
            ->all();
    }

    /**
     * Language codes + display names available for this template's variant
     * group on this organization.
     *
     * @return array<int, array{code: string, name: string}>
     */
    public function availableLanguages(): array
    {
        return collect($this->variants())
            ->map(fn (self $template) => [
                'code' => (string) $template->language,
                'name' => LanguageCatalog::name((string) $template->language),
            ])
            ->sortBy('code')
            ->values()
            ->all();
    }

    /**
     * A short regional label shown on language badges, e.g. "EN" / "MR" / "HI".
     */
    public function languageBadge(): string
    {
        return strtoupper((string) $this->language);
    }

    /**
     * Extract the ordered, de-duplicated {{...}} placeholder tokens in a body.
     * Positional tokens ({{1}}, {{2}}) are kept verbatim so the fallback
     * renderer can replace them in order.
     *
     * @return array<int, string>
     */
    public static function parsePlaceholders(string $body): array
    {
        preg_match_all('/\{\{\s*([^{}]+?)\s*\}\}/', $body, $matches);

        return collect($matches[1] ?? [])
            ->map(fn (string $token) => trim($token))
            ->filter(fn (string $token) => $token !== '')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * The ordered, de-duplicated {{...}} tokens across a template's header,
     * body and footer. Tokens may repeat across sections; the union is what
     * must be mapped and resolved so every occurrence renders.
     *
     * @return array<int, string>
     */
    public static function parseTemplatePlaceholders(string $header, string $body, string $footer): array
    {
        return collect([
            ...static::parsePlaceholders($header),
            ...static::parsePlaceholders($body),
            ...static::parsePlaceholders($footer),
        ])->unique()->values()->all();
    }

    /**
     * The full placeholder union for this template: the stored placeholder
     * list combined with any tokens authored (or synced) in the header, body
     * or footer. Rendering substitutes every occurrence, including a variable
     * used twice across sections.
     *
     * @return array<int, string>
     */
    public function placeholdersForText(): array
    {
        return collect($this->placeholders ?? [])
            ->merge(static::parseTemplatePlaceholders(
                (string) ($this->header ?? ''),
                (string) ($this->body ?? ''),
                (string) ($this->footer ?? '')
            ))
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Whether a placeholder name is a valid QWA named variable (send-template
     * renders named {{variable}} tokens). Positional tokens fall back to the
     * pre-rendered send-text path.
     */
    public static function isNamedPlaceholder(string $placeholder): bool
    {
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $placeholder) === 1;
    }

    /**
     * The variable names this template can be sent with, keyed by the exact
     * token that appears inside the template (positional tokens keep digits).
     * Header and footer tokens are included so a variable used in any section
     * is resolvable and substitutable on every occurrence.
     *
     * @return array<string, string> body-token => send-time variable key
     */
    public function variableKeys(): array
    {
        $keys = [];

        foreach ($this->placeholdersForText() as $placeholder) {
            $keys[$placeholder] = static::isNamedPlaceholder((string) $placeholder)
                ? (string) $placeholder
                : mb_substr((string) $placeholder, 0, 32);
        }

        return $keys;
    }

    /**
     * True when every placeholder can be rendered by QWA's native
     * send-template endpoint with a vars object. Locally authored custom
     * templates always fall back to the pre-rendered send-text path.
     */
    public function canSendNatively(): bool
    {
        if ($this->is_custom) {
            return false;
        }

        $placeholders = $this->placeholders ?? [];

        return ! empty($this->qwa_template_id)
            && collect($placeholders)->every(fn ($placeholder) => static::isNamedPlaceholder((string) $placeholder));
    }

    /**
     * Seed a best-effort mapping from QWA placeholders onto the app's token
     * vocabulary: same-named tokens map to themselves, familiar aliases map to
     * their equivalents, everything else is left un-mapped for the admin.
     *
     * @return array<string, string> placeholder => Gurukul token tag
     */
    public static function defaultMapping(array $placeholders): array
    {
        $known = TemplateCatalog::tokenDataKeys();

        $aliases = [
            'name' => 'student_name',
            'full_name' => 'student_name',
            'child_name' => 'student_name',
            'student' => 'student_name',
            'class' => 'class',
            'section' => 'section',
            'phone' => 'phone',
            'mobile' => 'mobile_no',
            'school' => 'school_name',
            'parent' => 'parent_name',
            'parent_name' => 'parent_name',
            'guardian_name' => 'parent_name',
            'guardian' => 'parent_name',
            'date' => 'current_date',
            'payment' => 'total_paid',
            'balance' => 'student_overall_balance_due',
            'amount' => 'total_paid',
            'role' => 'designation',
            'designation' => 'designation',
            'subject' => 'alert_subject',
            'message' => 'alert_message',
            'description' => 'alert_message',
        ];

        $mapping = [];

        foreach ($placeholders as $placeholder) {
            if (! static::isNamedPlaceholder((string) $placeholder)) {
                continue;
            }

            $token = '{{'.$placeholder.'}}';

            $mapping[$placeholder] = $known[$token]
                ?? $aliases[$placeholder]
                ?? '';
        }

        return $mapping;
    }

    /**
     * Resolve the per-recipient vars object for the native send-template call.
     *
     * @param  array<string, mixed>  $context  per-recipient context (name, phone, class, section, ...)
     * @param  array<string, string>  $static   admin-entered static values for un-resolvable tokens
     * @return array<string, string> variable key => value
     */
    public function resolveVars(array $context, array $static = []): array
    {
        $mapping = is_array($this->mapping) ? $this->mapping : [];

        $contextKeys = [
            'student_name' => $context['student_name'] ?? $context['name'] ?? '',
            'staff_name' => $context['staff_name'] ?? $context['name'] ?? '',
            'first_name' => $context['first_name'] ?? ($context['name'] ?? ''),
            'last_name' => $context['last_name'] ?? '',
            'name' => $context['name'] ?? '',
            'phone' => $context['phone'] ?? '',
            'mobile_no' => $context['mobile_no'] ?? $context['phone'] ?? '',
            'mobile_number' => $context['mobile_number'] ?? $context['mobile_no'] ?? $context['phone'] ?? '',
            'guardian_phone' => $context['guardian_phone'] ?? $context['phone'] ?? '',
            'father_phone' => $context['father_phone'] ?? $context['phone'] ?? '',
            'mother_phone' => $context['mother_phone'] ?? $context['phone'] ?? '',
            'emergency_contact' => $context['emergency_contact'] ?? $context['phone'] ?? '',
            'class' => $context['class'] ?? '',
            'class_name' => $context['class_name'] ?? $context['class'] ?? '',
            'section' => $context['section'] ?? '',
            'section_name' => $context['section_name'] ?? $context['section'] ?? '',
            'class_section' => trim(($context['class_section'] ?? ($context['class'] ?? '')).' '.($context['section'] ?? '')),
            'school_name' => $context['school_name'] ?? '',
            'parent_name' => $context['parent_name']
                ?? $context['guardian_name']
                ?? $context['father_name']
                ?? '',
            'guardian_name' => $context['guardian_name']
                ?? $context['parent_name']
                ?? $context['father_name']
                ?? '',
            'father_name' => $context['father_name']
                ?? $context['parent_name']
                ?? $context['guardian_name']
                ?? '',
            'mother_name' => $context['mother_name'] ?? '',
            'current_date' => $context['current_date'] ?? (string) \Illuminate\Support\Carbon::now()->format('d M Y'),
            'issue_date' => $context['issue_date'] ?? $context['current_date'] ?? (string) \Illuminate\Support\Carbon::now()->format('d M Y'),
        ];

        $vars = [];

        foreach ($this->variableKeys() as $bodyToken => $varKey) {
            $gurukulToken = $mapping[$bodyToken] ?? '';
            $resolved = '';

            if (filled($gurukulToken)) {
                $resolved = array_key_exists($gurukulToken, $context)
                    ? (string) ($context[$gurukulToken] ?? '')
                    : (string) ($contextKeys[$gurukulToken] ?? '');
            }

            if (! filled($resolved) && isset($static[$bodyToken])) {
                $resolved = (string) $static[$bodyToken];
            }

            $vars[$varKey] = $resolved;
        }

        return $vars;
    }

    /**
     * Substitute every occurrence of each {{token}} in the given text with its
     * resolved value. Whitespace around the token name is tolerated so
     * `{{ school_name }}` renders the same as `{{school_name}}`.
     */
    private function substituteTemplateText(string $text, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $pattern = '/\{\{\s*'.preg_quote((string) $key, '/').'\s*\}\}/';
            $text = (string) preg_replace($pattern, (string) $value, $text);
        }

        return $text;
    }

    /**
     * Render the body for the pre-rendered send-text fallback path,
     * substituting each placeholder token with its resolved value and
     * stripping any leftover unresolved tokens.
     */
    public function renderBody(array $vars): string
    {
        $body = $this->substituteTemplateText($this->body ?? '', $vars);

        $body = preg_replace('/\{\{\s*[^{}]*?\s*\}\}/', '', $body) ?? $body;
        $body = preg_replace('/[ \t]+/', ' ', $body) ?? $body;
        $body = preg_replace('/\n{3,}/', "\n\n", $body) ?? $body;

        return trim($body);
    }

    /**
     * Full pre-rendered fallback text (header + body + footer). Substitution
     * runs over the combined text so a variable used twice — e.g. once in the
     * body and once in the footer — is replaced on every occurrence.
     */
    public function renderFullText(array $vars): string
    {
        $parts = [];

        if (filled($this->header)) {
            $parts[] = (string) $this->header;
        }

        $parts[] = $this->body ?? '';

        if (filled($this->footer)) {
            $parts[] = (string) $this->footer;
        }

        $text = $this->substituteTemplateText(implode("\n", $parts), $vars);

        $text = preg_replace('/\{\{\s*[^{}]*?\s*\}\}/', '', $text) ?? $text;
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

        return trim($text);
    }
}