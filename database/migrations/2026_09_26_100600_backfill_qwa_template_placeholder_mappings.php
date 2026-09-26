<?php

use App\Models\QwaWhatsappTemplate;
use App\Support\TemplateCatalog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Backfill every QWA template placeholder that currently maps to an empty
     * token with its same-named catalog token. Templates synced before the
     * catalog gained these placeholders (meetings, holidays, transport, exams,
     * homework, attendance, fee due dates, academic year) kept a blank mapping
     * that left the variable unresolved at send time.
     */
    public function up(): void
    {
        $known = TemplateCatalog::tokenDataKeys();

        foreach (QwaWhatsappTemplate::query()->cursor() as $template) {
            $mapping = is_array($template->mapping) ? $template->mapping : [];
            $changed = false;

            foreach ($template->placeholders ?? [] as $placeholder) {
                if (! QwaWhatsappTemplate::isNamedPlaceholder((string) $placeholder)) {
                    continue;
                }

                $token = '{{'.$placeholder.'}}';

                if (filled($mapping[$placeholder] ?? '') || ! isset($known[$token])) {
                    continue;
                }

                $mapping[$placeholder] = $known[$token];
                $changed = true;
            }

            if ($changed) {
                $template->mapping = $mapping;
                $template->save();
            }
        }
    }

    public function down(): void
    {
        // Data migration — the previous mapping is not recoverable.
    }
};