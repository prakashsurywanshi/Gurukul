<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OsmSheet extends Model
{
    protected $table = 'osm_sheets';

    protected $fillable = [
        'organization_id',
        'osm_session_id',
        'class_id',
        'subject',
        'sheets_count',
        'evaluated_count',
    ];

    protected function casts(): array
    {
        return [
            'sheets_count' => 'integer',
            'evaluated_count' => 'integer',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(OsmSession::class, 'osm_session_id');
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(OsmEvaluation::class, 'osm_sheet_id');
    }
}