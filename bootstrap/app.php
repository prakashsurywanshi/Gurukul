<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureOrganizationSubscriptionIsActive;
use App\Http\Middleware\EnsureStaffPermission;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group(base_path('routes/api.php'));
        },
    )->withBroadcasting(__DIR__.'/../routes/channels.php')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'organization.subscription' => EnsureOrganizationSubscriptionIsActive::class,
            'staff.permission' => EnsureStaffPermission::class,
            'driver.role' => \App\Http\Middleware\EnsureDriverApiAccess::class,
            'module.enabled' => \App\Http\Middleware\EnsureModuleEnabled::class,
            'audit.trail' => \App\Http\Middleware\LogAuditTrail::class,
            'set.locale' => SetLocale::class,
        ]);

        $middleware->append(SetLocale::class);

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
            'organization.subscription',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (HttpException $exception, Request $request) {
            if ($exception->getStatusCode() !== 419) {
                return null;
            }

            $redirectTo = $request->is('login') ? '/' : '/login';

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json(
                    ['message' => 'Your session has expired. Please refresh the page and try again.'],
                    419,
                );
            }

            return redirect()->guest($redirectTo);
        });
    })->create();
