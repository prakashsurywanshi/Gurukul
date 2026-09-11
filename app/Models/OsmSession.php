<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OsmSession extends Model
{
    protected $table = 'osm_sessions';

    protected $fillable = ['organization_id', 'name', 'term', 'status', 'notes', 'created_by'];

    public function sheets(): HasMany
    {
        return $this->hasMany(OsmSheet::class, 'osm_session_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(OsmEvaluation::class, 'osm_session_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}