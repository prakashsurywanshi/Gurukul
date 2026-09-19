<?php

namespace App\Services\Ai;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;

class FaceCandidateMatcher
{
    public function parseAnalysis(string $analysis): array
    {
        $fallback = [
            'quality' => 'unknown',
            'gender' => 'unknown',
            'estimatedAge' => null,
            'description' => $analysis,
        ];

        if (! preg_match('/\{[\s\S]*\}/', $analysis, $match)) {
            return $fallback;
        }

        $decoded = json_decode(trim($match[0]), true);

        if (! is_array($decoded)) {
            return $fallback;
        }

        $quality = in_array($decoded['quality'] ?? null, ['good', 'average', 'poor'], true)
            ? $decoded['quality']
            : 'unknown';

        $gender = in_array($decoded['gender'] ?? null, ['male', 'female'], true)
            ? $decoded['gender']
            : 'unknown';

        $age = filter_var($decoded['estimatedAge'] ?? null, FILTER_VALIDATE_INT);

        return [
            'quality' => $quality,
            'gender' => $gender,
            'estimatedAge' => ($age !== false && $age > 0 && $age < 90) ? $age : null,
            'description' => is_string($decoded['description'] ?? null)
                ? $decoded['description']
                : $analysis,
        ];
    }

    public function matchCandidates(Organization $organization, array $attributes): array
    {
        if (($attributes['gender'] ?? 'unknown') === 'unknown' && ($attributes['estimatedAge'] ?? null) === null) {
            return [];
        }

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'name', 'section'])
            ->mapWithKeys(fn (SchoolClass $schoolClass) => [
                $schoolClass->id => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->get(['id', 'admission_no', 'first_name', 'last_name', 'gender', 'date_of_birth', 'class_id']);

        $detectedGender = $attributes['gender'] ?? 'unknown';
        $detectedAge = $attributes['estimatedAge'] ?? null;

        $candidates = collect();

        foreach ($students as $student) {
            $score = 0;

            if ($detectedGender !== 'unknown' && $student->gender === $detectedGender) {
                $score += 50;
            }

            if ($detectedAge !== null && $student->date_of_birth) {
                $age = $student->date_of_birth->age;
                $diff = abs($age - $detectedAge);

                if ($diff === 0) {
                    $score += 50;
                } elseif ($diff === 1) {
                    $score += 35;
                } elseif ($diff <= 2) {
                    $score += 20;
                }
            }

            if ($score === 0) {
                continue;
            }

            $candidates->push([
                'score' => $score,
                'student' => [
                    'id' => (string) $student->id,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => $student->class_id ? ($classes[$student->class_id] ?? null) : null,
                ],
            ]);
        }

        return $candidates
            ->sortByDesc('score')
            ->take(3)
            ->values()
            ->map(fn (array $entry, int $rank) => ['rank' => $rank + 1] + $entry)
            ->all();
    }
}