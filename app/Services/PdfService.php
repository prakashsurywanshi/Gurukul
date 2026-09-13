<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Process;
use Throwable;

final class PdfService
{
    private const DRIVERS = ['dompdf', 'chromium', 'browser'];

    public function driver(): string
    {
        $driver = strtolower((string) config('pdf.driver', 'dompdf'));

        return in_array($driver, self::DRIVERS, true) ? $driver : 'dompdf';
    }

    public function download(string $html, string $filename, array $options = []): Response
    {
        return match ($this->driver()) {
            'chromium' => $this->chromium($html, $filename, $options),
            'browser' => $this->browser($html, $options),
            default => $this->dompdf($html, $filename, $options, false),
        };
    }

    public function stream(string $html, string $filename, array $options = []): Response
    {
        return match ($this->driver()) {
            'chromium' => $this->chromium($html, $filename, $options),
            'browser' => $this->browser($html, $options),
            default => $this->dompdf($html, $filename, $options, true),
        };
    }

    private function dompdf(string $html, string $filename, array $options, bool $inline): Response
    {
        $pdf = Pdf::loadHTML($html)
            ->setPaper(
                $options['paper'] ?? (string) config('pdf.paper', 'a4'),
                $options['orientation'] ?? (string) config('pdf.orientation', 'portrait')
            )
            ->setOption('isRemoteEnabled', true)
            ->setOption('defaultFont', $options['font'] ?? (string) config('pdf.default_font', 'sans-serif'));

        return $inline ? $pdf->stream($filename) : $pdf->download($filename);
    }

    private function chromium(string $html, string $filename, array $options): Response
    {
        if (! $this->chromiumBinary()) {
            return $this->dompdf($html, $filename, $options, false);
        }

        $tmpHtml = tempnam(sys_get_temp_dir(), 'pdf_').'.html';
        $tmpPdf = tempnam(sys_get_temp_dir(), 'pdf_').'.pdf';

        file_put_contents($tmpHtml, $html);

        try {
            $command = array_values(array_filter([
                $this->chromiumBinary(),
                '--headless',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--print-to-pdf='.$tmpPdf,
                '--no-pdf-header-footer',
                'file://'.$tmpHtml,
            ]));

            $process = new Process($command, null, null, null, (float) config('pdf.timeout', 30));
            $process->run();

            if (! $process->isSuccessful() || ! is_file($tmpPdf) || filesize($tmpPdf) === 0) {
                return $this->dompdf($html, $filename, $options, false);
            }

            return response()->download($tmpPdf, $filename, ['Content-Type' => 'application/pdf'])
                ->deleteFileAfterSend(true);
        } catch (Throwable) {
            return $this->dompdf($html, $filename, $options, false);
        } finally {
            @unlink($tmpHtml);
            @unlink($tmpPdf);
        }
    }

    private function browser(string $html, array $options): Response
    {
        $title = e($options['title'] ?? 'Print Document');

        $body = <<<HTML
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{$title}</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
            </style>
          </head>
          <body>{$html}<script>window.onload = function(){ window.print(); };</script></body>
        </html>
        HTML;

        return response($body)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function chromiumBinary(): ?string
    {
        $configured = (string) config('pdf.chromium_binary');

        if ($configured !== '' && is_executable($configured)) {
            return $configured;
        }

        $candidates = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];

        foreach ($candidates as $binary) {
            $path = trim((string) shell_exec('which '.escapeshellarg($binary).' 2>/dev/null'));

            if ($path !== '') {
                return $path;
            }
        }

        return null;
    }
}