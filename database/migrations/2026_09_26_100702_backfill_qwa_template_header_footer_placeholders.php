<?php

use App\Models\QwaWhatsappTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Existing QWA templates only stored placeholders parsed from the body.
     * Tokens authored in the header or footer (e.g. {{parent_name}} and
     * {{school_name}}) were therefore never mapped or substituted — a variable
     * used twice across sections rendered only once. Recompute the full
     * placeholder union and re-derive the mapping defaults for the added
     * tokens while preserving any hand-authored mappings.
     */
    public function up(): void
    {
        QwaWhatsappTemplate::query()
            ->orderBy('id')
            ->chunkById(200, function ($templates): void {
                foreach ($templates as $template) {
                    $placeholders = QwaWhatsappTemplate::parseTemplatePlaceholders(
                        (string) ($template->header ?? ''),
                        (string) ($template->body ?? ''),
                        (string) ($template->footer ?? '')
                    );

                    $existing = is_array($template->mapping) ? $template->mapping : [];

                    $mapping = array_replace(
                        QwaWhatsappTemplate::defaultMapping($placeholders),
                        collect($existing)->only($placeholders)->all()
                    );

                    if ($placeholders !== ($template->placeholders ?? []) || $mapping !== $existing) {
                        $template->update([
                            'placeholders' => $placeholders,
                            'mapping' => $mapping,
                        ]);
                    }
                }
            });
    }

    public function down(): void
    {
    }
};