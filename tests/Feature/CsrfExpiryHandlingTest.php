<?php

namespace Tests\Feature;

use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Tests\TestCase;

class CsrfExpiryHandlingTest extends TestCase
{
    public function test_csrf_mismatch_on_json_request_returns_419_payload(): void
    {
        $response = $this->handler()->render(
            Request::create('/login', 'POST', [], [], [], ['HTTP_ACCEPT' => 'application/json']),
            new TokenMismatchException(),
        );

        $this->assertSame(419, $response->getStatusCode());
        $this->assertSame(
            'Your session has expired. Please refresh the page and try again.',
            $response->getData(true)['message'],
        );
    }

    public function test_csrf_mismatch_on_browser_request_redirects_to_login(): void
    {
        $response = $this->handler()->render(
            Request::create('/dashboard', 'POST'),
            new TokenMismatchException(),
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame('/login', (parse_url($response->getTargetUrl(), PHP_URL_PATH) ?: "/"));
    }

    public function test_csrf_mismatch_on_inertia_request_redirects_to_login(): void
    {
        $response = $this->handler()->render(
            Request::create('/dashboard', 'POST', [], [], [], ['HTTP_X_INERTIA' => 'true']),
            new TokenMismatchException(),
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame('/login', (parse_url($response->getTargetUrl(), PHP_URL_PATH) ?: "/"));
    }

    public function test_csrf_mismatch_on_login_page_redirects_home(): void
    {
        $response = $this->handler()->render(
            Request::create('/login', 'POST'),
            new TokenMismatchException(),
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame('/', (parse_url($response->getTargetUrl(), PHP_URL_PATH) ?: "/"));
    }

    public function test_419_error_page_view_exists(): void
    {
        $this->assertFileExists(resource_path('views/errors/419.blade.php'));
    }

    private function handler(): ExceptionHandler
    {
        return $this->app->make(ExceptionHandler::class);
    }
}