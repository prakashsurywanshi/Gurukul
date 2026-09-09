<?php

namespace App\Http\Middleware;

use App\Support\LanguageCatalog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Resolve the active locale from (in priority order):
     *  1. the `lang` query parameter (API clients / deep links)
     *  2. the `locale` cookie (explicit web UI selection)
     *  3. the primary (universal/master) language — the default UI language
     *
     * The browser's Accept-Language header is intentionally ignored: the
     * UI language is a universal-language concept. The regional language
     * is only used for student records and output like certificates, and
     * never drives the dashboard or site UI. The resolved locale is applied
     * to the application for server-rendered strings and stored on the
     * request so shared Inertia/API payloads can expose it to clients.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);

        if (LanguageCatalog::isValidCode($locale)) {
            App::setLocale($locale);
            $request->attributes->set('locale', $locale);
        }

        return $next($request);
    }

    private function resolveLocale(Request $request): ?string
    {
        $query = $request->query('lang');
        if (is_string($query) && $query !== '' && LanguageCatalog::isValidCode($query)) {
            return $query;
        }

        $cookie = $request->cookie('locale');
        if (is_string($cookie) && $cookie !== '' && LanguageCatalog::isValidCode($cookie)) {
            return $cookie;
        }

        // No explicit choice yet: default to the primary/universal
        // language. The regional language is not a UI language and must
        // never leak into the dashboard or site locale.
        return LanguageCatalog::PRIMARY_LANGUAGE;
    }
}