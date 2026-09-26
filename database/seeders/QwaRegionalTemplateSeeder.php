<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\QwaWhatsappTemplate;
use App\Services\QwaRegionalTemplateService;
use App\Support\QwaTemplateIntents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

/**
 * Creates Marathi and Hindi custom QWA templates for every canonical intent
 * so each existing English template has a regional-language variant. Safe to
 * re-run: existing variants are reused, nothing is duplicated.
 */
class QwaRegionalTemplateSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('qwa_whatsapp_templates')) {
            $this->command?->warn('Skipping QWA regional templates: table does not exist yet.');

            return;
        }

        $service = app(QwaRegionalTemplateService::class);

        $organizations = Organization::query()
            ->whereIn('id', QwaWhatsappTemplate::query()->select('organization_id')->distinct())
            ->get();

        if ($organizations->isEmpty()) {
            $this->command?->warn('No organizations with QWA templates found; nothing to seed.');

            return;
        }

        foreach ($organizations as $organization) {
            $created = 0;
            $reused = 0;

            foreach (QwaTemplateIntents::keys() as $intentKey) {
                foreach (QwaTemplateIntents::languageCodes() as $language) {
                    $wasPresent = QwaWhatsappTemplate::query()
                        ->where('organization_id', $organization->id)
                        ->where('variant_key', $intentKey)
                        ->where('language', $language)
                        ->exists();

                    $service->ensureRegionalVariant($organization->id, $intentKey, $language);

                    if ($wasPresent) {
                        $reused++;
                    } else {
                        $created++;
                    }
                }
            }

            $this->command?->info(sprintf(
                'Organization "%s": %d regional variants created, %d already present.',
                $organization->name,
                $created,
                $reused,
            ));
        }
    }
}