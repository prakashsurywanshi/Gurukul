<?php

use App\Http\Controllers\Api\AcademicsApiController;
use App\Http\Controllers\Api\AttendanceApiController;
use App\Http\Controllers\Api\AttendanceCorrectionApiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CertificateApiController;
use App\Http\Controllers\Api\CommunicationApiController;
use App\Http\Controllers\Api\DriverApiController;
use App\Http\Controllers\CommunicationController;
use App\Http\Controllers\Api\ExamApiController;
use App\Http\Controllers\Api\FeedbackApiController;
use App\Http\Controllers\Api\FeesApiController;
use App\Http\Controllers\Api\FrontOfficeApiController;
use App\Http\Controllers\Api\HostelApiController;
use App\Http\Controllers\Api\OnlineExamApiController;
use App\Http\Controllers\Api\PayrollApiController;
use App\Http\Controllers\Api\StaffApiController;
use App\Http\Controllers\Api\StaffAttendanceApiController;
use App\Http\Controllers\Api\StaffLeaveApiController;
use App\Http\Controllers\Api\StudentApiController;
use App\Http\Controllers\Api\InventoryApiController;
use App\Http\Controllers\Api\LibraryApiController;
use App\Http\Controllers\Api\TransportApiController;
use App\Http\Controllers\Api\TodoApiController;
use App\Http\Controllers\Api\KnowledgeBaseApiController;
use App\Http\Controllers\Api\ReportsApiController;
use App\Http\Controllers\Api\RolePermissionApiController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:30,1');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:20,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::get('/permissions', [AuthController::class, 'permissions']);
        Route::get('/subscription-status', [AuthController::class, 'subscriptionStatus']);
        Route::post('/device-token', [AuthController::class, 'registerDeviceToken']);
        Route::delete('/device-token', [AuthController::class, 'unregisterDeviceToken']);
    });
});

Route::middleware(['auth:sanctum', 'staff.permission:Dashboard Home,view'])->prefix('dashboard')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\DashboardApiController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Search Students,view'])->prefix('students')->group(function () {
    Route::get('/', [StudentApiController::class, 'index']);
    Route::post('/', [StudentApiController::class, 'store'])->middleware('staff.permission:Online Admission,add');
    Route::get('/{id}', [StudentApiController::class, 'show']);
    Route::put('/{id}', [StudentApiController::class, 'update'])->middleware('staff.permission:Edit Student,edit');
    Route::delete('/{id}', [StudentApiController::class, 'destroy'])->middleware('staff.permission:Bulk Delete Students,delete');
    Route::post('/bulk-delete', [StudentApiController::class, 'bulkDestroy'])->middleware('staff.permission:Bulk Delete Students,delete');
    Route::get('/deleted', [StudentApiController::class, 'bulkDeleteList'])->middleware('staff.permission:Bulk Delete Students,view');
    Route::get('/classes', [StudentApiController::class, 'getClassOptions']);

    Route::get('/alumni', [StudentApiController::class, 'alumniRecords'])->middleware('staff.permission:Alumni Records,view');
    Route::post('/alumni', [StudentApiController::class, 'storeAlumni'])->middleware('staff.permission:Alumni Records,add');
});

Route::middleware(['auth:sanctum', 'staff.permission:User Management,view'])->prefix('staff')->group(function () {
    Route::get('/', [StaffApiController::class, 'index']);
    Route::post('/', [StaffApiController::class, 'store'])->middleware('staff.permission:User Management,add');
    Route::put('/{staff}', [StaffApiController::class, 'update'])->middleware('staff.permission:User Management,edit');
    Route::patch('/{staff}/status', [StaffApiController::class, 'updateStatus'])->middleware('staff.permission:User Management,edit');
    Route::post('/{staff}/reset-password', [StaffApiController::class, 'resetPassword'])->middleware('staff.permission:User Management,edit');
    Route::delete('/{staff}', [StaffApiController::class, 'destroy'])->middleware('staff.permission:User Management,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Staff Attendance,view'])->prefix('staff-attendance')->group(function () {
    Route::get('/', [StaffAttendanceApiController::class, 'index']);
    Route::post('/', [StaffAttendanceApiController::class, 'store'])->middleware('staff.permission:Staff Attendance,edit');
});

Route::middleware(['auth:sanctum', 'staff.permission:Leave Management,view'])->prefix('staff-leave')->group(function () {
    Route::get('/', [StaffLeaveApiController::class, 'index']);
    Route::post('/balances', [StaffLeaveApiController::class, 'updateBalances'])->middleware('staff.permission:Leave Management,edit');
    Route::post('/', [StaffLeaveApiController::class, 'store'])->middleware('staff.permission:Leave Management,add');
    Route::patch('/{leaveRequest}/status', [StaffLeaveApiController::class, 'updateStatus'])->middleware('staff.permission:Leave Management,edit');
    Route::patch('/{leaveRequest}', [StaffLeaveApiController::class, 'update'])->middleware('staff.permission:Leave Management,edit');
    Route::delete('/{leaveRequest}', [StaffLeaveApiController::class, 'destroy'])->middleware('staff.permission:Leave Management,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Payroll Management,view'])->prefix('payroll')->group(function () {
    Route::get('/', [PayrollApiController::class, 'index']);
    Route::post('/', [PayrollApiController::class, 'store'])->middleware('staff.permission:Payroll Management,edit');
    Route::get('/{payrollEntry}/payslip', [PayrollApiController::class, 'payslip']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Class / Section,view'])->prefix('academics')->group(function () {
    Route::get('/classes', [AcademicsApiController::class, 'indexClasses']);
    Route::post('/classes', [AcademicsApiController::class, 'storeClass'])->middleware('staff.permission:Class / Section,add');
    Route::put('/classes/{schoolClass}', [AcademicsApiController::class, 'updateClass'])->middleware('staff.permission:Class / Section,edit');
    Route::delete('/classes/{schoolClass}', [AcademicsApiController::class, 'destroyClass'])->middleware('staff.permission:Class / Section,delete');

    Route::post('/sections', [AcademicsApiController::class, 'storeSection'])->middleware('staff.permission:Class / Section,add');
    Route::put('/sections/{section}', [AcademicsApiController::class, 'updateSection'])->middleware('staff.permission:Class / Section,edit');
    Route::delete('/sections/{section}', [AcademicsApiController::class, 'destroySection'])->middleware('staff.permission:Class / Section,delete');

    Route::get('/subjects', [AcademicsApiController::class, 'indexSubjects'])->middleware('staff.permission:Subjects,view');
    Route::post('/subjects', [AcademicsApiController::class, 'storeSubject'])->middleware('staff.permission:Subjects,add');
    Route::put('/subjects/{subject}', [AcademicsApiController::class, 'updateSubject'])->middleware('staff.permission:Subjects,edit');
    Route::delete('/subjects/{subject}', [AcademicsApiController::class, 'destroySubject'])->middleware('staff.permission:Subjects,delete');

    Route::get('/timetable', [AcademicsApiController::class, 'indexTimetable'])->middleware('staff.permission:Class Time Table,view');
    Route::post('/timetable', [AcademicsApiController::class, 'storeTimetableEntry'])->middleware('staff.permission:Class Time Table,add');
    Route::put('/timetable/{timetable}', [AcademicsApiController::class, 'updateTimetableEntry'])->middleware('staff.permission:Class Time Table,edit');
    Route::delete('/timetable/{timetable}', [AcademicsApiController::class, 'destroyTimetableEntry'])->middleware('staff.permission:Class Time Table,delete');

    Route::get('/lesson-plans', [AcademicsApiController::class, 'indexLessonPlans'])->middleware('staff.permission:Lesson Plan,view');
    Route::post('/lesson-plans', [AcademicsApiController::class, 'storeLessonPlan'])->middleware('staff.permission:Lesson Plan,add');
    Route::put('/lesson-plans/{lessonPlan}', [AcademicsApiController::class, 'updateLessonPlan'])->middleware('staff.permission:Lesson Plan,edit');
    Route::delete('/lesson-plans/{lessonPlan}', [AcademicsApiController::class, 'destroyLessonPlan'])->middleware('staff.permission:Lesson Plan,delete');

    Route::get('/homework', [AcademicsApiController::class, 'indexHomework'])->middleware('staff.permission:Homework,view');
    Route::post('/homework', [AcademicsApiController::class, 'storeHomework'])->middleware('staff.permission:Homework,add');
    Route::post('/homework/{homework}/submit', [AcademicsApiController::class, 'submitHomework']);
    Route::get('/homework/{homework}/submissions', [AcademicsApiController::class, 'getSubmissionsForHomework']);
    Route::put('/homework-submissions/{homeworkSubmission}/evaluate', [AcademicsApiController::class, 'evaluateHomework'])->middleware('staff.permission:Homework,edit');

    Route::get('/promote/data', [AcademicsApiController::class, 'getPromoteData'])->middleware('staff.permission:Promote Students,view');
    Route::post('/promote', [AcademicsApiController::class, 'promoteStudents'])->middleware('staff.permission:Promote Students,add');
    Route::post('/promote/alumni', [AcademicsApiController::class, 'saveToAlumni'])->middleware('staff.permission:Alumni Records,add');
});

Route::middleware(['auth:sanctum', 'staff.permission:Attendance Management,view'])->prefix('attendance')->group(function () {
    Route::get('/classes', [AttendanceApiController::class, 'indexClasses']);
    Route::get('/students', [AttendanceApiController::class, 'indexStudents']);
    Route::post('/', [AttendanceApiController::class, 'store'])->middleware('staff.permission:Attendance Management,add');
    Route::get('/records', [AttendanceApiController::class, 'indexRecords']);
});

Route::middleware(['auth:sanctum', 'staff.permission:QR Code Attendance,view'])->prefix('attendance/qr')->group(function () {
    Route::get('/students', [AttendanceApiController::class, 'qrStudents']);
    Route::post('/', [AttendanceApiController::class, 'qrStore'])->middleware('staff.permission:QR Code Attendance,add');
    Route::get('/settings', [AttendanceApiController::class, 'qrSettings']);
    Route::post('/settings', [AttendanceApiController::class, 'qrSaveSettings'])->middleware('staff.permission:QR Code Attendance,edit');
});

Route::middleware(['auth:sanctum', 'staff.permission:Attendance Correction,view'])->prefix('attendance-corrections')->group(function () {
    Route::get('/', [AttendanceCorrectionApiController::class, 'index']);
    Route::get('/students', [AttendanceCorrectionApiController::class, 'students']);
    Route::post('/', [AttendanceCorrectionApiController::class, 'store'])->middleware('staff.permission:Attendance Correction,add');
    Route::patch('/{attendanceCorrection}/review', [AttendanceCorrectionApiController::class, 'review'])->middleware('staff.permission:Attendance Correction,edit');
});

Route::middleware(['auth:sanctum', 'staff.permission:Fees Management,view'])->prefix('fees')->group(function () {
    Route::get('/overview', [FeesApiController::class, 'indexOverview']);
    Route::get('/structures', [FeesApiController::class, 'indexStructures']);
    Route::post('/structures', [FeesApiController::class, 'storeStructure'])->middleware('staff.permission:Fees Management,add');
    Route::put('/structures/{structure}', [FeesApiController::class, 'updateStructure'])->middleware('staff.permission:Fees Management,edit');
    Route::delete('/structures/{structure}', [FeesApiController::class, 'destroyStructure'])->middleware('staff.permission:Fees Management,delete');

    Route::get('/students', [FeesApiController::class, 'indexStudents']);
    Route::post('/assign', [FeesApiController::class, 'assignFees'])->middleware('staff.permission:Fees Management,add');
    Route::get('/student-fees', [FeesApiController::class, 'indexStudentFees']);

    Route::post('/payments', [FeesApiController::class, 'collectPayment'])->middleware('staff.permission:Fees Management,add');
    Route::post('/payments/{payment}/revert', [FeesApiController::class, 'revertPayment'])->middleware('staff.permission:Fees Management,edit');
    Route::get('/payments', [FeesApiController::class, 'indexPayments']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Income Management,view'])->prefix('fees/income')->group(function () {
    Route::get('/', [FeesApiController::class, 'indexIncomeEntries']);
    Route::post('/', [FeesApiController::class, 'storeIncomeEntry'])->middleware('staff.permission:Income Management,add');
    Route::put('/{entry}', [FeesApiController::class, 'updateIncomeEntry'])->middleware('staff.permission:Income Management,edit');
    Route::delete('/{entry}', [FeesApiController::class, 'destroyIncomeEntry'])->middleware('staff.permission:Income Management,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Expense Management,view'])->prefix('fees/expenses')->group(function () {
    Route::get('/', [FeesApiController::class, 'indexExpenseEntries']);
    Route::post('/', [FeesApiController::class, 'storeExpenseEntry'])->middleware('staff.permission:Expense Management,add');
    Route::put('/{entry}', [FeesApiController::class, 'updateExpenseEntry'])->middleware('staff.permission:Expense Management,edit');
    Route::delete('/{entry}', [FeesApiController::class, 'destroyExpenseEntry'])->middleware('staff.permission:Expense Management,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Exam Management,view'])->prefix('exams')->group(function () {
    Route::get('/', [ExamApiController::class, 'index']);
    Route::post('/', [ExamApiController::class, 'store'])->middleware('staff.permission:Exam Management,add');
    Route::put('/{exam}', [ExamApiController::class, 'update'])->middleware('staff.permission:Exam Management,edit');
    Route::post('/{exam}/schedules', [ExamApiController::class, 'saveSchedules'])->middleware('staff.permission:Exam Management,add');
    Route::post('/schedules/{examSchedule}/results', [ExamApiController::class, 'saveResults'])->middleware('staff.permission:Exam Management,edit');
    Route::delete('/{exam}', [ExamApiController::class, 'destroy'])->middleware('staff.permission:Exam Management,delete');

    Route::get('/hall-ticket', [ExamApiController::class, 'hallTicketData']);
    Route::get('/print-marksheet', [ExamApiController::class, 'printMarksheetData']);
    Route::get('/student/offline', [ExamApiController::class, 'studentOfflineExams']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Online Exams,view'])->prefix('online-exams')->group(function () {
    Route::get('/', [OnlineExamApiController::class, 'index']);
    Route::post('/', [OnlineExamApiController::class, 'store'])->middleware('staff.permission:Online Exams,add');
    Route::put('/{onlineExam}', [OnlineExamApiController::class, 'update'])->middleware('staff.permission:Online Exams,edit');
    Route::delete('/{onlineExam}', [OnlineExamApiController::class, 'destroy'])->middleware('staff.permission:Online Exams,delete');

    Route::post('/{onlineExam}/submit', [OnlineExamApiController::class, 'submit']);
    Route::get('/results/{attemptId}', [OnlineExamApiController::class, 'result']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Feedback Management,view'])->prefix('feedback')->group(function () {
    Route::get('/admin', [FeedbackApiController::class, 'adminIndex']);
    Route::get('/student', [FeedbackApiController::class, 'studentIndex']);
    Route::post('/', [FeedbackApiController::class, 'store'])->middleware('staff.permission:Feedback Management,add');
    Route::post('/{feedbackCampaign}/submit', [FeedbackApiController::class, 'submit']);
    Route::put('/{feedbackCampaign}', [FeedbackApiController::class, 'update'])->middleware('staff.permission:Feedback Management,edit');
    Route::delete('/{feedbackCampaign}', [FeedbackApiController::class, 'destroy'])->middleware('staff.permission:Feedback Management,delete');
    Route::get('/{feedbackCampaign}', [FeedbackApiController::class, 'campaignDetail']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Messages,view'])->prefix('communication')->group(function () {
    Route::get('/audience-options', [CommunicationApiController::class, 'getAudienceOptions']);

    Route::prefix('messages')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexMessages']);
        Route::post('/', [CommunicationApiController::class, 'sendMessage'])->middleware('staff.permission:Messages,add');
        Route::get('/{id}', [CommunicationApiController::class, 'showMessage']);
        Route::post('/{id}/star', [CommunicationApiController::class, 'toggleMessageStar']);
        Route::post('/{id}/archive', [CommunicationApiController::class, 'archiveMessage']);
    });

    Route::prefix('notices')->middleware('staff.permission:Notice Board,view')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexNotices']);
        Route::post('/', [CommunicationApiController::class, 'storeNotice'])->middleware('staff.permission:Notice Board,add');
        Route::get('/{id}', [CommunicationApiController::class, 'showNotice']);
        Route::put('/{id}', [CommunicationApiController::class, 'updateNotice'])->middleware('staff.permission:Notice Board,edit');
        Route::delete('/{id}', [CommunicationApiController::class, 'destroyNotice'])->middleware('staff.permission:Notice Board,delete');
    });

    Route::prefix('voice-calls')->middleware('staff.permission:Voice Calls,view')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexVoiceCalls']);
        Route::post('/', [CommunicationApiController::class, 'storeVoiceCall'])->middleware('staff.permission:Voice Calls,add');
        Route::post('/{id}/cancel', [CommunicationApiController::class, 'cancelVoiceCall']);
        Route::get('/{id}/audio', [CommunicationApiController::class, 'serveVoiceCallAudio']);
    });

    Route::prefix('emails')->middleware('staff.permission:Send Emails,view')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexEmails']);
        Route::post('/', [CommunicationApiController::class, 'sendEmail'])->middleware('staff.permission:Send Emails,add');
        Route::delete('/{id}', [CommunicationApiController::class, 'destroyEmail'])->middleware('staff.permission:Send Emails,delete');
    });

    Route::prefix('download-center')->middleware('staff.permission:Download Center,view')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexDownloadCenter']);
        Route::post('/media', [CommunicationApiController::class, 'uploadDownloadCenterMedia'])->middleware('staff.permission:Download Center,add');
        Route::post('/share', [CommunicationApiController::class, 'shareDownloadCenterMedia'])->middleware('staff.permission:Download Center,add');
        Route::get('/shares/{share}/download', [CommunicationApiController::class, 'downloadDownloadCenterContent']);
        Route::delete('/shares/{id}', [CommunicationApiController::class, 'deleteDownloadCenterShare'])->middleware('staff.permission:Download Center,delete');
    });

    Route::prefix('send-whatsapp')->middleware('staff.permission:Send Whatsapp,view')->group(function () {
        Route::get('/', [CommunicationApiController::class, 'indexWhatsapp']);
        Route::post('/', [CommunicationApiController::class, 'storeWhatsapp'])->middleware('staff.permission:Send Whatsapp,add');
        Route::delete('/{message}', [CommunicationApiController::class, 'destroyWhatsapp'])->middleware('staff.permission:Send Whatsapp,delete');
        Route::get('/status', [CommunicationController::class, 'whatsappBridgeStatus']);
        Route::post('/disconnect', [CommunicationController::class, 'disconnectWhatsapp'])->middleware('staff.permission:Send Whatsapp,edit');
    });
});

Route::middleware(['auth:sanctum', 'staff.permission:Hostel Management,view'])->prefix('hostel')->group(function () {
    Route::get('/overview', [HostelApiController::class, 'getOverview']);

    Route::prefix('hostels')->group(function () {
        Route::get('/', [HostelApiController::class, 'indexHostels']);
        Route::post('/', [HostelApiController::class, 'storeHostel'])->middleware('staff.permission:Hostel Management,add');
        Route::put('/{hostel}', [HostelApiController::class, 'updateHostel'])->middleware('staff.permission:Hostel Management,edit');
        Route::delete('/{hostel}', [HostelApiController::class, 'destroyHostel'])->middleware('staff.permission:Hostel Management,delete');
    });

    Route::prefix('rooms')->group(function () {
        Route::get('/', [HostelApiController::class, 'indexRooms']);
        Route::post('/', [HostelApiController::class, 'storeRoom'])->middleware('staff.permission:Hostel Management,add');
        Route::put('/{room}', [HostelApiController::class, 'updateRoom'])->middleware('staff.permission:Hostel Management,edit');
        Route::delete('/{room}', [HostelApiController::class, 'destroyRoom'])->middleware('staff.permission:Hostel Management,delete');
    });

    Route::prefix('beds')->group(function () {
        Route::get('/', [HostelApiController::class, 'indexBeds']);
        Route::post('/', [HostelApiController::class, 'storeBed'])->middleware('staff.permission:Hostel Management,add');
        Route::put('/{bed}', [HostelApiController::class, 'updateBed'])->middleware('staff.permission:Hostel Management,edit');
        Route::delete('/{bed}', [HostelApiController::class, 'destroyBed'])->middleware('staff.permission:Hostel Management,delete');
    });

    Route::prefix('fee-structures')->group(function () {
        Route::get('/', [HostelApiController::class, 'indexFeeStructures']);
        Route::post('/', [HostelApiController::class, 'storeFeeStructure'])->middleware('staff.permission:Hostel Management,add');
        Route::put('/{structure}', [HostelApiController::class, 'updateFeeStructure'])->middleware('staff.permission:Hostel Management,edit');
        Route::delete('/{structure}', [HostelApiController::class, 'destroyFeeStructure'])->middleware('staff.permission:Hostel Management,delete');
    });

    Route::prefix('fee-collection')->middleware('staff.permission:Hostel Fee Collection,view')->group(function () {
        Route::get('/', [HostelApiController::class, 'getFeeCollection']);
        Route::post('/payments', [HostelApiController::class, 'collectFeePayment'])->middleware('staff.permission:Hostel Fee Collection,add');
        Route::post('/payments/{feePayment}/revert', [HostelApiController::class, 'revertFeePayment'])->middleware('staff.permission:Hostel Fee Collection,edit');
    });
});

Route::middleware(['auth:sanctum', 'module.enabled:transport', 'staff.permission:Transport Management,view'])->prefix('transport')->group(function () {
    Route::get('/overview', [TransportApiController::class, 'getOverview']);

    Route::prefix('routes')->group(function () {
        Route::get('/', [TransportApiController::class, 'indexRoutes']);
        Route::post('/', [TransportApiController::class, 'storeRoute'])->middleware('staff.permission:Transport Management,add');
        Route::put('/{route}', [TransportApiController::class, 'updateRoute'])->middleware('staff.permission:Transport Management,edit');
        Route::delete('/{route}', [TransportApiController::class, 'destroyRoute'])->middleware('staff.permission:Transport Management,delete');
    });

    Route::prefix('vehicles')->group(function () {
        Route::get('/', [TransportApiController::class, 'indexVehicles']);
        Route::post('/', [TransportApiController::class, 'storeVehicle'])->middleware('staff.permission:Transport Management,add');
        Route::put('/{vehicle}', [TransportApiController::class, 'updateVehicle'])->middleware('staff.permission:Transport Management,edit');
        Route::delete('/{vehicle}', [TransportApiController::class, 'destroyVehicle'])->middleware('staff.permission:Transport Management,delete');
    });

    Route::prefix('assignments')->group(function () {
        Route::get('/', [TransportApiController::class, 'indexAssignments']);
        Route::post('/', [TransportApiController::class, 'storeAssignment'])->middleware('staff.permission:Transport Management,add');
        Route::put('/{assignment}', [TransportApiController::class, 'updateAssignment'])->middleware('staff.permission:Transport Management,edit');
        Route::delete('/{assignment}', [TransportApiController::class, 'destroyAssignment'])->middleware('staff.permission:Transport Management,delete');
        Route::post('/{assignment}/approve', [TransportApiController::class, 'approveAssignment'])->middleware('staff.permission:Transport Management,edit');
        Route::post('/{assignment}/reject', [TransportApiController::class, 'rejectAssignment'])->middleware('staff.permission:Transport Management,edit');
    });

    Route::prefix('trips')->group(function () {
        Route::get('/', [TransportApiController::class, 'indexTrips']);
        Route::post('/', [TransportApiController::class, 'storeTrip'])->middleware('staff.permission:Transport Management,add');
        Route::put('/{trip}', [TransportApiController::class, 'updateTrip'])->middleware('staff.permission:Transport Management,edit');
        Route::delete('/{trip}', [TransportApiController::class, 'destroyTrip'])->middleware('staff.permission:Transport Management,delete');
    });

    Route::prefix('fee-collection')->middleware('staff.permission:Transport Fee Collection,view')->group(function () {
        Route::get('/', [TransportApiController::class, 'indexFeeCollection']);
        Route::post('/payments', [TransportApiController::class, 'collectPayment'])->middleware('staff.permission:Transport Fee Collection,add');
        Route::post('/payments/{feePayment}/revert', [TransportApiController::class, 'revertPayment'])->middleware('staff.permission:Transport Fee Collection,edit');
    });
});

Route::middleware(['auth:sanctum', 'staff.permission:Certificate Management,view'])->prefix('certificates')->group(function () {
    Route::get('/overview', [CertificateApiController::class, 'getOverview']);

    Route::prefix('templates')->group(function () {
        Route::get('/', [CertificateApiController::class, 'indexTemplates']);
        Route::post('/', [CertificateApiController::class, 'storeTemplate'])->middleware('staff.permission:Certificate Management,add');
        Route::get('/{template}', [CertificateApiController::class, 'showTemplate']);
        Route::put('/{template}', [CertificateApiController::class, 'updateTemplate'])->middleware('staff.permission:Certificate Management,edit');
        Route::delete('/{template}', [CertificateApiController::class, 'destroyTemplate'])->middleware('staff.permission:Certificate Management,delete');
    });

    Route::prefix('issued')->group(function () {
        Route::get('/', [CertificateApiController::class, 'indexIssuedCertificates']);
        Route::post('/', [CertificateApiController::class, 'issueCertificate'])->middleware('staff.permission:Certificate Management,add');
        Route::post('/bulk', [CertificateApiController::class, 'issueBulkCertificates'])->middleware('staff.permission:Certificate Management,add');
        Route::get('/{issuedCertificate}', [CertificateApiController::class, 'showIssuedCertificate']);
        Route::put('/{issuedCertificate}', [CertificateApiController::class, 'updateIssuedCertificate'])->middleware('staff.permission:Certificate Management,edit');
        Route::delete('/{issuedCertificate}', [CertificateApiController::class, 'destroyIssuedCertificate'])->middleware('staff.permission:Certificate Management,delete');
    });

    Route::get('/my-certificates', [CertificateApiController::class, 'getStudentCertificates']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Inventory Management,view'])->prefix('inventory')->group(function () {
    Route::get('/overview', [InventoryApiController::class, 'getOverview']);

    Route::prefix('categories')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getCategories']);
        Route::post('/', [InventoryApiController::class, 'storeCategory'])->middleware('staff.permission:Inventory Management,add');
        Route::put('/{category}', [InventoryApiController::class, 'updateCategory'])->middleware('staff.permission:Inventory Management,edit');
        Route::delete('/{category}', [InventoryApiController::class, 'destroyCategory'])->middleware('staff.permission:Inventory Management,delete');
    });

    Route::prefix('stores')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getStores']);
        Route::post('/', [InventoryApiController::class, 'storeStore'])->middleware('staff.permission:Inventory Management,add');
        Route::put('/{store}', [InventoryApiController::class, 'updateStore'])->middleware('staff.permission:Inventory Management,edit');
        Route::delete('/{store}', [InventoryApiController::class, 'destroyStore'])->middleware('staff.permission:Inventory Management,delete');
    });

    Route::prefix('suppliers')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getSuppliers']);
        Route::post('/', [InventoryApiController::class, 'storeSupplier'])->middleware('staff.permission:Inventory Management,add');
        Route::put('/{supplier}', [InventoryApiController::class, 'updateSupplier'])->middleware('staff.permission:Inventory Management,edit');
        Route::delete('/{supplier}', [InventoryApiController::class, 'destroySupplier'])->middleware('staff.permission:Inventory Management,delete');
    });

    Route::prefix('items')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getItems']);
        Route::post('/', [InventoryApiController::class, 'storeItem'])->middleware('staff.permission:Inventory Management,add');
        Route::put('/{item}', [InventoryApiController::class, 'updateItem'])->middleware('staff.permission:Inventory Management,edit');
        Route::delete('/{item}', [InventoryApiController::class, 'destroyItem'])->middleware('staff.permission:Inventory Management,delete');
    });

    Route::prefix('stock')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getStockEntries']);
        Route::post('/', [InventoryApiController::class, 'storeStockEntry'])->middleware('staff.permission:Inventory Management,add');
        Route::delete('/{stockEntry}', [InventoryApiController::class, 'destroyStockEntry'])->middleware('staff.permission:Inventory Management,delete');
    });

    Route::prefix('issues')->group(function () {
        Route::get('/', [InventoryApiController::class, 'getIssues']);
        Route::post('/', [InventoryApiController::class, 'storeIssue'])->middleware('staff.permission:Inventory Management,add');
        Route::post('/{issue}/return', [InventoryApiController::class, 'returnIssue'])->middleware('staff.permission:Inventory Management,edit');
        Route::delete('/{issue}', [InventoryApiController::class, 'destroyIssue'])->middleware('staff.permission:Inventory Management,delete');
    });
});

Route::middleware(['auth:sanctum', 'staff.permission:Library Management,view'])->prefix('library')->group(function () {
    Route::get('/overview', [LibraryApiController::class, 'getOverview']);

    Route::prefix('books')->group(function () {
        Route::get('/', [LibraryApiController::class, 'getBooks']);
        Route::post('/', [LibraryApiController::class, 'storeBook'])->middleware('staff.permission:Library Management,add');
        Route::put('/{book}', [LibraryApiController::class, 'updateBook'])->middleware('staff.permission:Library Management,edit');
        Route::delete('/{book}', [LibraryApiController::class, 'destroyBook'])->middleware('staff.permission:Library Management,delete');
        Route::post('/import', [LibraryApiController::class, 'importBooks'])->middleware('staff.permission:Library Management,add');
    });

    Route::prefix('members')->group(function () {
        Route::get('/', [LibraryApiController::class, 'getMembers']);
        Route::post('/{memberKey}/card', [LibraryApiController::class, 'generateCard'])->middleware('staff.permission:Library Management,add');
    });

    Route::prefix('circulation')->group(function () {
        Route::get('/', [LibraryApiController::class, 'getCirculation']);
        Route::post('/', [LibraryApiController::class, 'issueBook'])->middleware('staff.permission:Library Management,add');
        Route::post('/{circulation}/return', [LibraryApiController::class, 'returnBook'])->middleware('staff.permission:Library Management,edit');
        Route::delete('/{circulation}', [LibraryApiController::class, 'destroyCirculation'])->middleware('staff.permission:Library Management,delete');
    });

    Route::prefix('requests')->group(function () {
        Route::get('/', [LibraryApiController::class, 'getRequests']);
        Route::post('/', [LibraryApiController::class, 'storeRequest'])->middleware('staff.permission:Library Management,add');
        Route::put('/{request}/status', [LibraryApiController::class, 'updateRequestStatus'])->middleware('staff.permission:Library Management,edit');
        Route::delete('/{request}', [LibraryApiController::class, 'destroyRequest'])->middleware('staff.permission:Library Management,delete');
    });
});

Route::middleware('auth:sanctum')->prefix('student')->group(function () {
    Route::get('/dashboard', [StudentApiController::class, 'getDashboard']);
    Route::get('/attendance', [StudentApiController::class, 'getAttendance']);
    Route::get('/exam-results', [StudentApiController::class, 'getExamResults']);
    Route::get('/offline-exams', [StudentApiController::class, 'getStudentOfflineExams']);
    Route::get('/profile', [StudentApiController::class, 'getProfile']);
    Route::put('/profile', [StudentApiController::class, 'updateProfile']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Sessions,view'])->prefix('sessions')->group(function () {
    Route::get('/', [SettingsController::class, 'apiSessions']);
    Route::patch('/{academicYear}/activate', [SettingsController::class, 'apiActivateSession'])->middleware('staff.permission:Sessions,edit');
});

Route::middleware(['auth:sanctum', 'staff.permission:Todo,view'])->prefix('todo')->group(function () {
    Route::get('/', [TodoApiController::class, 'index']);
    Route::post('/', [TodoApiController::class, 'store'])->middleware('staff.permission:Todo,add');
    Route::put('/{todo}', [TodoApiController::class, 'update'])->middleware('staff.permission:Todo,edit');
    Route::patch('/{todo}/toggle', [TodoApiController::class, 'toggleComplete'])->middleware('staff.permission:Todo,edit');
    Route::delete('/{todo}', [TodoApiController::class, 'destroy'])->middleware('staff.permission:Todo,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Reports & Analytics,view'])->prefix('reports')->group(function () {
    Route::get('/analytics', [ReportsApiController::class, 'analytics']);
    Route::get('/overview', [ReportsApiController::class, 'overview']);
    Route::get('/attendance', [ReportsApiController::class, 'attendance']);
    Route::get('/fee', [ReportsApiController::class, 'fee']);
    Route::get('/exam', [ReportsApiController::class, 'exam']);
    Route::get('/progress', [ReportsApiController::class, 'progress']);
    Route::get('/staff', [ReportsApiController::class, 'staff']);
    Route::get('/library', [ReportsApiController::class, 'library']);
    Route::get('/transport', [ReportsApiController::class, 'transport']);
    Route::get('/hostel', [ReportsApiController::class, 'hostel']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Knowledge Base,view'])->prefix('knowledge-base')->group(function () {
    Route::get('/', [KnowledgeBaseApiController::class, 'index']);
    Route::get('/modules', [KnowledgeBaseApiController::class, 'modules']);
    Route::get('/faqs', [KnowledgeBaseApiController::class, 'faqs']);
    Route::get('/settings', [KnowledgeBaseApiController::class, 'settings']);
    Route::get('/search', [KnowledgeBaseApiController::class, 'search']);
});

Route::middleware(['auth:sanctum', 'staff.permission:Admission Enquiry,view'])->prefix('front-office/admission-enquiries')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexAdmissionEnquiries']);
    Route::post('/', [FrontOfficeApiController::class, 'storeAdmissionEnquiry'])->middleware('staff.permission:Admission Enquiry,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updateAdmissionEnquiry'])->middleware('staff.permission:Admission Enquiry,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyAdmissionEnquiry'])->middleware('staff.permission:Admission Enquiry,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Visitor Register,view'])->prefix('front-office/visitors')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexVisitors']);
    Route::post('/', [FrontOfficeApiController::class, 'storeVisitor'])->middleware('staff.permission:Visitor Register,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updateVisitor'])->middleware('staff.permission:Visitor Register,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyVisitor'])->middleware('staff.permission:Visitor Register,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Phone Call Log,view'])->prefix('front-office/phone-calls')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexPhoneCalls']);
    Route::post('/', [FrontOfficeApiController::class, 'storePhoneCall'])->middleware('staff.permission:Phone Call Log,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updatePhoneCall'])->middleware('staff.permission:Phone Call Log,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyPhoneCall'])->middleware('staff.permission:Phone Call Log,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Postal Dispatch,view'])->prefix('front-office/postal-dispatches')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexPostalDispatches']);
    Route::post('/', [FrontOfficeApiController::class, 'storePostalDispatch'])->middleware('staff.permission:Postal Dispatch,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updatePostalDispatch'])->middleware('staff.permission:Postal Dispatch,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyPostalDispatch'])->middleware('staff.permission:Postal Dispatch,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Postal Delivery,view'])->prefix('front-office/postal-deliveries')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexPostalDeliveries']);
    Route::post('/', [FrontOfficeApiController::class, 'storePostalDelivery'])->middleware('staff.permission:Postal Delivery,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updatePostalDelivery'])->middleware('staff.permission:Postal Delivery,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyPostalDelivery'])->middleware('staff.permission:Postal Delivery,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Complains,view'])->prefix('front-office/complaints')->group(function () {
    Route::get('/', [FrontOfficeApiController::class, 'indexComplaints']);
    Route::post('/', [FrontOfficeApiController::class, 'storeComplaint'])->middleware('staff.permission:Complains,add');
    Route::put('/{id}', [FrontOfficeApiController::class, 'updateComplaint'])->middleware('staff.permission:Complains,edit');
    Route::delete('/{id}', [FrontOfficeApiController::class, 'destroyComplaint'])->middleware('staff.permission:Complains,delete');
});

Route::middleware(['auth:sanctum', 'staff.permission:Roles & Permissions,view'])->prefix('roles/permissions')->group(function () {
    Route::get('/', [RolePermissionApiController::class, 'index']);
    Route::put('/', [RolePermissionApiController::class, 'update'])->middleware('staff.permission:Roles & Permissions,edit');
});

Route::prefix('biometric')->group(function () {
    Route::get('/status', [\App\Http\Controllers\Api\BiometricApiController::class, 'status']);
    Route::post('/attendance', [\App\Http\Controllers\Api\BiometricApiController::class, 'attendance']);
    Route::post('/logs', [\App\Http\Controllers\Api\BiometricApiController::class, 'logs']);
});

Route::prefix('transport/gps')->group(function () {
    Route::get('/status', [\App\Http\Controllers\Api\TransportGpsApiController::class, 'status']);
    Route::post('/', [\App\Http\Controllers\Api\TransportGpsApiController::class, 'position']);
});

Route::prefix('cctv')->group(function () {
    Route::get('/status', [\App\Http\Controllers\Api\CctvIngestionApiController::class, 'status']);
    Route::post('/face-scan', [\App\Http\Controllers\Api\CctvIngestionApiController::class, 'faceScan']);
});

Route::middleware(['auth:sanctum', 'driver.role'])->prefix('driver')->group(function () {
    Route::get('/me', [DriverApiController::class, 'me']);
    Route::get('/routes', [DriverApiController::class, 'routes']);
    Route::get('/trips', [DriverApiController::class, 'trips']);
    Route::post('/trips', [DriverApiController::class, 'startTrip']);
    Route::get('/trips/{trip}', [DriverApiController::class, 'trip']);
    Route::post('/trips/{trip}/reached-stop', [DriverApiController::class, 'reachedStop']);
    Route::post('/trips/{trip}/end', [DriverApiController::class, 'endTrip']);
    Route::post('/trips/{trip}/boarding', [DriverApiController::class, 'markBoarding']);
    Route::post('/trips/{trip}/gps', [DriverApiController::class, 'updateGps']);

    // Bus policy and roster self-service, gated per vehicle by the bus policy.
    Route::get('/vehicles', [DriverApiController::class, 'myVehicles']);
    Route::put('/vehicles/{vehicle}/policy', [DriverApiController::class, 'updateVehiclePolicy']);
    Route::get('/assignments', [DriverApiController::class, 'assignments']);
    Route::get('/assignments/available-students', [DriverApiController::class, 'availableStudents']);
    Route::post('/assignments', [DriverApiController::class, 'storeAssignment'])->middleware('throttle:60,1');
    Route::delete('/assignments/{assignment}', [DriverApiController::class, 'destroyAssignment']);
});

Route::middleware('auth:sanctum')->prefix('parent')->group(function () {
    Route::get('/kids', [\App\Http\Controllers\Api\ParentApiController::class, 'kids']);
    Route::get('/tickets', [\App\Http\Controllers\Api\ParentApiController::class, 'tickets']);
    Route::post('/tickets', [\App\Http\Controllers\Api\ParentApiController::class, 'createTicket']);
    Route::get('/kids/{student}/fees', [\App\Http\Controllers\Api\ParentApiController::class, 'fees']);
    Route::get('/kids/{student}/attendance', [\App\Http\Controllers\Api\ParentApiController::class, 'attendance']);
    Route::get('/kids/{student}/homework', [\App\Http\Controllers\Api\ParentApiController::class, 'homework']);
    Route::get('/kids/{student}/payments', [\App\Http\Controllers\Api\ParentApiController::class, 'payments']);
});
