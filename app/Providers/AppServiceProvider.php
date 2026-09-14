<?php

namespace App\Providers;

use App\Models\Attendance;
use App\Models\ExamResult;
use App\Models\FeePayment;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\HostelAllocation;
use App\Models\InventoryItem;
use App\Models\LessonPlan;
use App\Models\LibraryCirculation;
use App\Models\StaffAttendance;
use App\Models\StaffPayrollEntry;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\TransportAssignment;
use App\Models\User;
use App\Observers\AuditTrailObserver;
use App\Services\Approvals\ApprovalModuleRegistry;
use App\Services\SmtpSettingsService;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(ApprovalModuleRegistry::class, function () {
            return new ApprovalModuleRegistry(config('approvals.modules', []));
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->applyStoredSmtpSettings();
        $this->registerAuditTrailObservers();
    }

    private function registerAuditTrailObservers(): void
    {
        $observedModels = [
            Student::class,
            Attendance::class,
            FeePayment::class,
            StudentFee::class,
            ExamResult::class,
            LessonPlan::class,
            Homework::class,
            HomeworkSubmission::class,
            StaffAttendance::class,
            StaffPayrollEntry::class,
            User::class,
            HostelAllocation::class,
            TransportAssignment::class,
            InventoryItem::class,
            LibraryCirculation::class,
        ];

        foreach ($observedModels as $modelClass) {
            $modelClass::observe(AuditTrailObserver::class);
        }
    }

    private function applyStoredSmtpSettings(): void
    {
        try {
            app(SmtpSettingsService::class)->applyActiveSettings();
        } catch (Throwable) {
            // Fall back to default mail config when the settings table or database is unavailable.
        }
    }
}
