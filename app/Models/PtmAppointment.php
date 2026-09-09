<?php

namespace App\Models;

use App\Models\Concerns\Localizable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PtmAppointment extends Model
{
    use HasFactory;
    use Localizable;

    protected $fillable = [
        'organization_id',
        'ptm_session_id',
        'student_id',
        'parent_name',
        'parent_contact',
        'slot_time',
        'notes',
        'status',
        'created_by',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(PtmSession::class, 'ptm_session_id');
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