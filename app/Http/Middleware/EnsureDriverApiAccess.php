<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDriverApiAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->role === 'driver', 403, 'Driver access only.');

        return $next($request);
    }
}