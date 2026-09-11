<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbcPathway extends Model
{
    protected $table = 'cbc_pathways';

    protected $fillable = ['organization_id', 'name', 'code', 'description'];
}