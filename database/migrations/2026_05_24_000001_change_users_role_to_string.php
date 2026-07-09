<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(255) NOT NULL DEFAULT 'student'");

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('student')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $allowedRoles = ['super_admin', 'admin', 'receptionist', 'teacher', 'accountant', 'librarian', 'student', 'parent'];

        DB::table('users')
            ->whereNotIn('role', $allowedRoles)
            ->update(['role' => 'teacher']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('super_admin','admin','receptionist','teacher','accountant','librarian','student','parent') NOT NULL DEFAULT 'student'");

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['super_admin', 'admin', 'receptionist', 'teacher', 'accountant', 'librarian', 'student', 'parent'])
                ->default('student')
                ->change();
        });
    }
};
