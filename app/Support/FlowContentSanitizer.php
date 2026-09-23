<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Defence-in-depth sanitizer for the rich-text "flow" editor.
 *
 * Flow templates store the printable page as raw HTML (tables, inline styles,
 * `@page` rules, `{{token}}` placeholders) — unlike the Canvas Designer's
 * note-card allowlist, which strips all of that. This sanitizer is permissive
 * on structure (so a full page design survives a round trip) but strict on
 * anything executable: `<script>`, embedded frames, event handlers and
 * `javascript:`/`vbscript:` URLs are removed. `data:` URLs are kept only for
 * images so inlined SVG/PNG thumbnails still render.
 */
class FlowContentSanitizer
{
    /** Elements that must never survive. */
    private const FORBIDDEN_TAGS = [
        'SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET',
        'META', 'LINK', 'BASE', 'BASE64', 'FORM', 'INPUT', 'BUTTON',
        'TEXTAREA', 'SELECT', 'OPTION', 'STYLE',
    ];

    /** Event-handler and other dangerous attribute prefixes that are stripped. */
    private const FORBIDDEN_ATTR_PREFIXES = [
        'on', 'xmlns', 'form',
    ];

    /** Element attributes whose value may be a URL. */
    private const URL_ATTRS = ['href', 'src', 'action', 'poster', 'background', 'data', 'xlink:href', 'srcset', 'cite', 'longdesc'];

    private const MAX_BODY = 3_000_000;

    /**
     * Sanitise a block of flow HTML. Returns the input unchanged when the
     * fragment cannot be parsed.
     */
    public static function sanitize(string $html): string
    {
        $html = trim((string) $html);
        if ($html === '') {
            return $html;
        }

        try {
            $dom = new DOMDocument();
            $prev = libxml_use_internal_errors(true);
            $loaded = $dom->loadHTML(
                '<?xml encoding="UTF-8"><div id="fc-root">'.$html.'</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );
            libxml_clear_errors();
            libxml_use_internal_errors($prev);

            if (! $loaded) {
                return $html;
            }

            $root = $dom->getElementsByTagName('div')->item(0);
            if (! $root) {
                return $html;
            }

            self::walk($dom);

            return mb_substr(self::serializeChildren($dom, $root), 0, self::MAX_BODY);
        } catch (\Throwable) {
            return $html;
        }
    }

    /**
     * Depth-first clean of the whole tree: drop forbidden elements, strip
     * unsafe attributes, then rewrite dangerous URL values.
     */
    private static function walk(DOMDocument $dom): void
    {
        $next = $dom->getElementsByTagName('*');
        $elements = [];
        foreach ($next as $element) {
            $elements[] = $element;
        }

        foreach (array_reverse($elements) as $element) {
            \assert($element instanceof DOMElement);
            $tag = strtoupper($element->tagName);

            if (in_array($tag, self::FORBIDDEN_TAGS, true)) {
                // `<style>` is the only "forbidden" tag we keep — it carries
                // `@page` rules and print styles for page-flow documents. Any
                // other forbidden tag is removed entirely.
                if ($tag === 'STYLE') {
                    self::sanitizeStyle($element);
                    continue;
                }

                $element->parentNode?->removeChild($element);
                continue;
            }

            self::sanitizeAttributes($element);
        }
    }

    /** Remove dangerous attributes and URL schemes from one element. */
    private static function sanitizeAttributes(DOMElement $element): void
    {
        $remove = [];
        foreach ($element->attributes as $attribute) {
            $name = strtolower($attribute->name);

            if (self::isForbiddenAttribute($name)) {
                $remove[] = $attribute->name;
                continue;
            }

            $value = trim((string) $attribute->value);
            if (in_array($name, self::URL_ATTRS, true) && self::isUnsafeUrl($value)) {
                $remove[] = $attribute->name;
            }
        }

        foreach ($remove as $name) {
            $element->removeAttribute($name);
        }
    }

    /**
     * Keep `@page`/print styling but drop @import and inline scripting the
     * browser would execute while the design is previewed or printed.
     */
    private static function sanitizeStyle(DOMElement $element): void
    {
        $css = (string) $element->textContent;
        $css = preg_replace('/(?:@import|@charset)\b[^;]*;/i', '', $css) ?? '';
        $css = preg_replace('/url\(\s*[\'"]?(?:javascript|vbscript|data:(?!image\/))\s*:?\s*[\'"]?[^)]*\)/i', 'url("")', $css) ?? '';
        $css = preg_replace('/expression\s*\(/i', 'filter(', $css) ?? '';

        while ($element->firstChild) {
            $element->removeChild($element->firstChild);
        }
        $element->appendChild($element->ownerDocument->createTextNode($css));
    }

    private static function isForbiddenAttribute(string $name): bool
    {
        /** @var string $prefix */
        foreach (self::FORBIDDEN_ATTR_PREFIXES as $prefix) {
            if (str_starts_with($name, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private static function isUnsafeUrl(string $value): bool
    {
        $lower = mb_strtolower($value);

        return str_starts_with($lower, 'javascript:')
            || str_starts_with($lower, 'vbscript:')
            || (str_starts_with($lower, 'data:') && ! str_starts_with($lower, 'data:image/'))
            || str_contains($lower, 'javascript:');
    }

    private static function serializeChildren(DOMDocument $dom, DOMElement $root): string
    {
        $html = '';
        foreach ($root->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }

        // libxml percent-encodes `{`/`}` inside URL attributes, turning
        // `<img src="{{qr_code_url}}">` into `%7B%7Bqr_code_url%7D%7D`. Restore
        // the braces so `{{token}}` placeholders still resolve at print time.
        $attr = '/(\s(?:'.implode('|', self::URL_ATTRS).')=")[^"]*"/i';
        $html = preg_replace_callback(
            $attr,
            static fn (array $match): string => $match[1]
                .str_ireplace(['%7B', '%7D'], ['{', '}'], $match[0]),
            $html
        ) ?? $html;

        return $html;
    }
}