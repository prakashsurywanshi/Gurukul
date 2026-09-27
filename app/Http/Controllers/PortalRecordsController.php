<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\PortalReadinessService;
use App\Services\PortalRecordBuilder;
use App\Services\XlsxExportService;
use App\Support\PortalFieldCatalog;
use App\Support\PortalPresets;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Throwable;
use ZipArchive;

class PortalRecordsController extends Controller
{
    public function __construct(
        private readonly PortalReadinessService $readiness,
        private readonly PortalRecordBuilder $builder
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $settings = $this->readiness->ensureDefaults($organization);
        $state = $settings['state'];
        $report = $this->readiness->forState($organization, $state);

        $customTemplates = collect($report['customTemplates'])->map(function (array $template) use ($organization) {
            try {
                $template['readiness'] = $this->readiness->readiness($organization, 'custom', $template)['sheets'];
            } catch (Throwable) {
                $template['readiness'] = [];
            }

            return $template;
        })->values()->all();

        $profile = is_array($organization->settings['compliance_profile'] ?? null)
            ? $organization->settings['compliance_profile']
            : [];

        return Inertia::render('dashboard/PortalRecords', [
            'user' => $user,
            'states' => PortalPresets::states(),
            'currentState' => $state,
            'presets' => $report['presets'],
            'customTemplates' => $customTemplates,
            'fieldLabels' => PortalFieldCatalog::labels(),
            'lookups' => PortalRecordBuilder::LOOKUPS,
            'udiseCode' => $settings['udise_code'] ?? trim((string) ($profile['udise_code'] ?? '')),
            'academicYear' => $this->academicYearName($organization),
        ]);
    }

    public function updateState(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $request->validate([
            'state' => ['required', Rule::in(array_keys(PortalPresets::states()))],
        ]);

        $this->readiness->updateState($organization, $validated['state']);

        return response()->json(['success' => true]);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        [$presetKey, $customPreset] = $this->resolveSchema($request, $organization);

        $format = $request->string('format', 'xlsx')->toString();
        $mode = $request->string('mode', 'filled')->toString();
        $sheetFilter = $request->string('sheet')->toString();

        if (! in_array($format, ['xlsx', 'csv', 'csv-zip'], true)) {
            abort(422, 'Unsupported export format.');
        }

        if (! in_array($mode, ['filled', 'blank'], true)) {
            abort(422, 'Unsupported export mode.');
        }

        $sheets = collect($this->builder->sheets($organization, $presetKey, $customPreset))
            ->when($sheetFilter !== '', fn ($collection) => $collection->filter(fn (array $sheet) => $sheet['name'] === $sheetFilter)->values())
            ->map(fn (array $sheet) => [
                'name' => $sheet['name'],
                'entity' => $sheet['entity'],
                'columns' => $sheet['columns'],
                'rows' => $mode === 'filled' ? $sheet['rows'] : [],
            ])
            ->values()
            ->all();

        if (empty($sheets)) {
            abort(404, 'No matching sheets found for the selected schema.');
        }

        $stamp = now()->format('Y-m-d');
        $schemaSlug = $this->schemaSlug($presetKey, $customPreset);

        if ($format === 'xlsx') {
            $binary = app(XlsxExportService::class)->build($sheets);

            return app(XlsxExportService::class)->download($binary, "{$schemaSlug}-{$mode}-{$stamp}.xlsx");
        }

        return $this->csvResponse($sheets, $schemaSlug, $mode, $stamp, $format === 'csv-zip');
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $this->validateTemplate($request);

        $this->readiness->saveTemplate($organization, $this->templatePayload($validated));

        return response()->json(['success' => true]);
    }

    public function updateTemplate(Request $request, string $id)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $validated = $this->validateTemplate($request);

        try {
            $this->readiness->saveTemplate($organization, $this->templatePayload($validated), $id);
        } catch (\InvalidArgumentException $exception) {
            abort(404, $exception->getMessage());
        }

        return response()->json(['success' => true]);
    }

    public function destroyTemplate(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $this->readiness->deleteTemplate($organization, $id);

        return response()->json(['success' => true]);
    }

    private function validateTemplate(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'sheets' => ['required', 'array', 'min:1', 'max:10'],
            'sheets.*.name' => ['required', 'string', 'max:31'],
            'sheets.*.entity' => ['required', Rule::in(PortalFieldCatalog::entityKeys())],
            'sheets.*.columns' => ['required', 'array', 'min:1', 'max:60'],
            'sheets.*.columns.*.label' => ['required', 'string', 'max:120'],
            'sheets.*.columns.*.source' => ['nullable', 'string'],
            'sheets.*.columns.*.static' => ['nullable', 'string', 'max:255'],
            'sheets.*.columns.*.required' => ['nullable', 'boolean'],
            'sheets.*.columns.*.type' => ['nullable', Rule::in(['text', 'number', 'auto'])],
            'sheets.*.columns.*.lookup' => ['nullable', Rule::in(PortalRecordBuilder::LOOKUPS)],
        ]);
    }

    private function templatePayload(array $validated): array
    {
        $sheets = array_map(function (array $sheet) {
            $columns = array_map(function (array $column) {
                return [
                    'label' => $column['label'],
                    'source' => $column['source'] ?? $column['static'] ?? null,
                    'static' => $column['static'] ?? null,
                    'required' => (bool) ($column['required'] ?? false),
                    'type' => $column['type'] ?? 'auto',
                    'lookup' => $column['lookup'] ?? null,
                ];
            }, $sheet['columns']);

            return [
                'name' => $sheet['name'],
                'entity' => $sheet['entity'],
                'columns' => $columns,
            ];
        }, $validated['sheets']);

        return [
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'sheets' => $sheets,
        ];
    }

    private function resolveSchema(Request $request, Organization $organization): array
    {
        $schema = $request->string('schema', 'udiseplus')->toString();

        if (str_starts_with($schema, 'custom:')) {
            $id = substr($schema, 7);
            $template = $this->readiness->customTemplateById($organization, $id);

            if ($template === null) {
                abort(404, 'Custom template not found.');
            }

            return ['custom', $template];
        }

        if (PortalPresets::find($schema) === null) {
            abort(404, 'Unknown portal schema.');
        }

        return [$schema, null];
    }

    private function schemaSlug(string $presetKey, ?array $customPreset): string
    {
        if ($customPreset !== null) {
            return str_replace(' ', '-', strtolower((string) ($customPreset['name'] ?? 'custom')));
        }

        return $presetKey;
    }

    private function csvResponse(array $sheets, string $schemaSlug, string $mode, string $stamp, bool $forceZip)
    {
        $files = [];

        foreach ($sheets as $sheet) {
            $filename = $this->safeFilename($sheet['name']);
            $files[$filename.'.csv'] = $this->csvForSheet($sheet);
        }

        if (count($files) === 1 && ! $forceZip) {
            $name = array_key_first($files);

            return response($files[$name], 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$schemaSlug.'-'.$name.'"',
            ]);
        }

        $path = tempnam(sys_get_temp_dir(), 'qgzip');
        $zip = new ZipArchive();

        if ($path === false || $zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Unable to create ZIP archive.');
        }

        foreach ($files as $filename => $content) {
            $zip->addFromString($filename, $content);
        }

        $zip->close();
        $binary = (string) file_get_contents($path);
        @unlink($path);

        return response($binary, 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="'.$schemaSlug.'-'.$mode.'-'.$stamp.'.zip"',
        ]);
    }

    private function csvForSheet(array $sheet): string
    {
        $handle = fopen('php://temp', 'w+');
        fputcsv($handle, array_map(fn (array $column) => $column['label'], $sheet['columns']));

        foreach ($sheet['rows'] as $row) {
            $line = [];

            foreach ($sheet['columns'] as $column) {
                $line[] = $row[$column['label']] ?? '';
            }

            fputcsv($handle, $line);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content;
    }

    private function safeFilename(string $name): string
    {
        $name = preg_replace('/[^A-Za-z0-9_-]+/', '-', $name);

        return trim((string) $name, '-') ?: 'sheet';
    }

    private function academicYearName(Organization $organization): string
    {
        return $organization->selectedAcademicYear()?->name ?? 'Current Session';
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user
            ? Organization::where('id', $user->organization_id)->first()
            : null;
    }
}