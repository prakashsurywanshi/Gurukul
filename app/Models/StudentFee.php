<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\TransportAssignment;

class StudentFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'student_id',
        'fee_structure_id',
        'hostel_allocation_id',
        'transport_assignment_id',
        'academic_year_id',
        'semester_id',
        'month',
        'year',
        'amount',
        'discount',
        'fine',
        'net_amount',
        'paid_amount',
        'balance',
        'due_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'fine' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'due_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }

    public function hostelAllocation(): BelongsTo
    {
        return $this->belongsTo(HostelAllocation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(FeePayment::class);
    }

    public function transportAssignment(): BelongsTo
    {
        return $this->belongsTo(TransportAssignment::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
