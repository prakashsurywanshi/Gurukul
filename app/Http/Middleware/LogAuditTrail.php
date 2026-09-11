<?php

namespace App\Http\Middleware;

use App\Models\AuditTrail;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class LogAuditTrail
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH') || $request->isMethod('DELETE')) {
            $this->logRequest($request, $response);
        }

        return $response;
    }

    private function logRequest(Request $request, Response $response): void
    {
        if ($response->getStatusCode() >= 400) {
            return;
        }

        $user = Auth::user();

        if (!$user || !$user->organization_id) {
            return;
        }

        $action = match (true) {
            $request->isMethod('POST') => 'created',
            $request->isMethod('PUT') || $request->isMethod('PATCH') => 'updated',
            $request->isMethod('DELETE') => 'deleted',
            default => null,
        };

        if (!$action) {
            return;
        }

        $modelType = $this->resolveModelType($request->route());
        $modelId = $this->resolveModelId($request->route());
        $module = $this->resolveModule($request->path());

        AuditTrail::create([
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'module' => $module,
            'description' => $this->buildDescription($action, $modelType, $modelId, $request->path()),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    private function resolveModelType(?object $route): ?string
    {
        if (!$route) {
            return null;
        }

        $parameters = $route->parameters();

        foreach ($parameters as $param) {
            if (is_object($param) && method_exists($param, 'getMorphClass')) {
                return get_class($param);
            }
        }

        return null;
    }

    private function resolveModelId(?object $route): ?int
    {
        if (!$route) {
            return null;
        }

        $parameters = $route->parameters();

        foreach ($parameters as $param) {
            if (is_object($param) && property_exists($param, 'id')) {
                return (int) $param->id;
            }
        }

        return null;
    }

    private function resolveModule(string $path): string
    {
        $segments = explode('/', trim($path, '/'));

        return $segments[0] ?? 'general';
    }

    private function buildDescription(string $action, ?string $modelType, ?int $modelId, string $path): string
    {
        $modelShortName = $modelType ? class_basename($modelType) : 'Record';

        return ucfirst($action) . ' ' . $modelShortName . ($modelId ? " #{$modelId}" : '') . ' via ' . strtoupper($path);
    }
}
