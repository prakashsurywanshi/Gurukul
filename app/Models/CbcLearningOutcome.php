<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CbcLearningOutcome extends Model
{
    protected $table = 'cbc_learning_outcomes';

    protected $fillable = ['organization_id', 'cbc_strand_id', 'name', 'code', 'description'];

    public function strand(): BelongsTo
    {
        return $this->belongsTo(CbcStrand::class, 'cbc_strand_id');
    }
}