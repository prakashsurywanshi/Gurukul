<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CbcStrand extends Model
{
    protected $table = 'cbc_strands';

    protected $fillable = ['organization_id', 'name', 'code', 'description'];

    public function learningOutcomes(): HasMany
    {
        return $this->hasMany(CbcLearningOutcome::class, 'cbc_strand_id');
    }
}