<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportCardRemark extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'exam_id',
        'student_id',
        'class_teacher_remark',
        'principal_remark',
    ];

    protected $casts = [
        'exam_id' => 'integer',
        'student_id' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}