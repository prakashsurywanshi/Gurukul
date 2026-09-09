<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incident extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'student_id',
        'type',
        'title',
        'description',
        'incident_date',
        'status',
        'action_taken',
        'created_by',
    ];

    protected $casts = [
        'incident_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}