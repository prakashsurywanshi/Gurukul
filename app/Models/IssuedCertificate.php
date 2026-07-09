<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IssuedCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'certificate_template_id',
        'student_id',
        'certificate_number',
        'student_name',
        'class',
        'section',
        'reason',
        'issue_date',
        'issued_by',
        'issued_by_designation',
        'file_path',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
