<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'exams' => [
                'name' => [200],
                'description' => 'text',
            ],
            'certificate_templates' => [
                'title' => [200],
                'description' => 'text',
            ],
            'fee_structures' => [
                'fee_type' => [200],
                'description' => 'text',
            ],
            'fee_types' => [
                'name' => [200],
                'description' => [200],
            ],
            'online_exams' => [
                'title' => [200],
                'subject' => [200],
            ],
            'subjects' => [
                'name' => [200],
                'description' => 'text',
            ],
        ];

        foreach ($tables as $table => $fields) {
            Schema::table($table, function (Blueprint $blueprint) use ($fields) {
                foreach ($fields as $base => $type) {
                    $length = is_array($type) ? $type[0] : null;

                    foreach (['mr', 'hi'] as $locale) {
                        $columnName = $base.'_'.$locale;

                        if (Schema::hasColumn($blueprint->getTable(), $columnName)) {
                            continue;
                        }

                        $column = $length !== null
                            ? $blueprint->string($columnName, $length)
                            : $blueprint->{$type}($columnName);

                        $column->nullable();
                    }
                }
            });
        }
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};