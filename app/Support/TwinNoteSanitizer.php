<?php

namespace App\Support;

use DOMDocument;

/**
 * Defence-in-depth sanitizer for the canvas-designer "note card" blocks.
 *
 * The designer already sanitises rich note body HTML in the browser, but the
 * stored template twin (`content` / `back_content`, `{{noteBodyHtml}}` inside
 * a `data-el="note-body"` div) and the fabric JSON (`noteBodyHtml` property)
 * travel through the server. Re-applying the same allowlist here keeps stored
 * templates safe: only simple inline formatting survives, no attributes, no
 * scripts/styles, nothing that could break the printed document.
 */
class TwinNoteSanitizer
{
    /** Tags permitted inside a note body (phrasing + simple block breaks). */
    private const NOTE_TAGS = ['B', 'STRONG', 'I', 'EM', 'U', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI'];

    /** How much rich text a single note card may hold. */
    private const MAX_BODY = 40000;

    /**
     * Sanitise the body of every `data-el="note-body"` block in a twin string.
     * Returns the input unchanged when the fragment cannot be parsed.
     */
    public static function sanitizeTwin(?string $twin): ?string
    {
        if ($twin === null || trim($twin) === '') {
            return $twin;
        }

        try {
            $dom = new DOMDocument();
            $prev = libxml_use_internal_errors(true);
            $loaded = $dom->loadHTML(
                '<?xml encoding="UTF-8"><div id="cd-root">'.$twin.'</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );
            libxml_clear_errors();
            libxml_use_internal_errors($prev);

            if (! $loaded) {
                return $twin;
            }

            $root = $dom->getElementsByTagName('div')->item(0);
            if (! $root) {
                return $twin;
            }

            $bodies = [];
            foreach ($root->getElementsByTagName('div') as $node) {
                if (strtolower((string) $node->getAttribute('data-el')) === 'note-body') {
                    $bodies[] = $node;
                }
            }

            foreach ($bodies as $body) {
                self::rewriteBody($dom, $body);
            }

            return self::serializeChildren($dom, $root);
        } catch (\Throwable) {
            return $twin;
        }
    }

    /**
     * Recursively walk a fabric JSON and sanitise every `noteBodyHtml` /
     * `noteTitle` group property so a reload never reintroduces markup.
     */
    public static function sanitizeJson(array $json): array
    {
        $walk = function (array $node) use (&$walk): array {
            foreach ($node as $key => $value) {
                if ($key === 'noteBodyHtml' && is_string($value)) {
                    $node[$key] = self::sanitizeBody($value);
                } elseif ($key === 'noteTitle' && is_string($value)) {
                    $node[$key] = self::sanitizeTitle($value);
                } elseif (is_array($value)) {
                    $node[$key] = $walk($value);
                }
            }

            return $node;
        };

        foreach ($json as $key => $value) {
            if (is_array($value)) {
                $json[$key] = $walk($value);
            }
        }

        return $json;
    }

    private static function rewriteBody(DOMDocument $dom, \DOMElement $body): void
    {
        $inner = '';
        foreach ($body->childNodes as $child) {
            $inner .= $dom->saveHTML($child);
        }

        $clean = self::sanitizeBody($inner);
        if ($clean === $inner) {
            return;
        }

        $tmp = new DOMDocument();
        $prev = libxml_use_internal_errors(true);
        $tmp->loadHTML('<div id="cd-frag">'.$clean.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($prev);

        $fragRoot = $tmp->getElementsByTagName('div')->item(0);
        if (! $fragRoot) {
            return;
        }

        while ($body->firstChild) {
            $body->removeChild($body->firstChild);
        }
        foreach ($fragRoot->childNodes as $node) {
            $body->appendChild($dom->importNode($node, true));
        }
    }

    private static function serializeChildren(DOMDocument $dom, \DOMElement $root): string
    {
        $html = '';
        foreach ($root->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }

        return $html;
    }

    /** Allowlist-only rich text: tags in NOTE_TAGS, all attributes stripped. */
    public static function sanitizeBody(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $html = preg_replace('#<script\b[^>]*>.*?</script\s*>#si', '', $html) ?? '';
        $html = preg_replace('#<style\b[^>]*>.*?</style\s*>#si', '', $html) ?? '';
        $html = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html) ?? '';

        $html = preg_replace_callback(
            '#<(/?)\s*([a-zA-Z][^>\s]*)([^>]*)>#',
            static function (array $m): string {
                $up = strtoupper($m[2]);
                if (! in_array($up, self::NOTE_TAGS, true)) {
                    return '';
                }
                $name = match ($up) {
                    'STRONG' => 'b',
                    'EM' => 'i',
                    'P' => 'div',
                    default => strtolower($up),
                };

                return $m[1] === '/' ? "</{$name}>" : "<{$name}>";
            },
            $html,
        ) ?? '';

        return mb_substr($html, 0, self::MAX_BODY);
    }

    public static function sanitizeTitle(string $title): string
    {
        $title = strip_tags($title);

        return mb_substr(trim($title), 0, 255);
    }
}