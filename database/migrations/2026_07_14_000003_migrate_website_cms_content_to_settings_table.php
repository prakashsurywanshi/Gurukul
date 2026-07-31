<?php

use App\Models\Organization;
use App\Models\WebsiteSetting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $organizations = Organization::all();

        foreach ($organizations as $org) {
            $websiteContent = $org->settings['website_cms_content'] ?? null;

            if (!is_array($websiteContent)) {
                continue;
            }

            $shared = $websiteContent['shared'] ?? [];
            $shared['activeTemplate'] = $websiteContent['activeTemplate'] ?? 'template1';
            $shared['theme'] = $websiteContent['theme'] ?? 'white';
            $shared['sliderImages'] = $websiteContent['sliderImages'] ?? [];

            WebsiteSetting::saveMany($org->id, $shared, 'shared');

            $templateKeys = ['template1', 'template2', 'template3', 'template4', 'template5'];
            foreach ($templateKeys as $templateKey) {
                $templateData = $websiteContent[$templateKey] ?? [];
                if (!empty($templateData)) {
                    WebsiteSetting::saveMany($org->id, $templateData, $templateKey);
                }
            }
        }
    }

    public function down(): void
    {
        WebsiteSetting::query()->delete();
    }
};
