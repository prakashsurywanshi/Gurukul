<?php

use App\Support\KnowledgeBaseContent;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('super_admin_settings') || ! Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            return;
        }

        $defaults = json_encode(KnowledgeBaseContent::defaults(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $existingRow = DB::table('super_admin_settings')->orderBy('id')->first();

        if (! $existingRow) {
            DB::table('super_admin_settings')->insert([
                'mailer' => 'smtp',
                'is_active' => true,
                'knowledge_base_content' => $defaults,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return;
        }

        if (empty($existingRow->knowledge_base_content)) {
            DB::table('super_admin_settings')
                ->where('id', $existingRow->id)
                ->update([
                    'knowledge_base_content' => $defaults,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('super_admin_settings') || ! Schema::hasColumn('super_admin_settings', 'knowledge_base_content')) {
            return;
        }

        DB::table('super_admin_settings')
            ->whereNotNull('knowledge_base_content')
            ->update([
                'knowledge_base_content' => null,
                'updated_at' => now(),
            ]);
    }
};
