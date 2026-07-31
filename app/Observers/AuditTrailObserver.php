<?php

namespace App\Observers;

use App\Models\AuditTrail;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditTrailObserver
{
    public function created(Model $model): void
    {
        $this->log('created', $model, null, $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $dirty = $model->getDirty();
        $original = $model->getOriginal();

        $changedOriginal = array_intersect_key($original, $dirty);

        $this->log('updated', $model, $changedOriginal, $dirty);
    }

    public function deleted(Model $model): void
    {
        $this->log('deleted', $model, $model->getAttributes(), null);
    }

    private function log(string $action, Model $model, ?array $oldValues, ?array $newValues): void
    {
        $user = Auth::user();

        if (!$user || !$user->organization_id) {
            return;
        }

        $modelType = get_class($model);
        $modelId = $model->getKey();

        $description = ucfirst($action) . ' ' . class_basename($modelType) . ($modelId ? " #{$modelId}" : '');

        AuditTrail::create([
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
