<?php

namespace App\Support;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;

class ContactPhoneResolver
{
    public static function normalize(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);
        $defaultCountryCode = preg_replace('/\D+/', '', (string) config('services.whatsapp_bridge.country_code', '91'));

        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) === 10 && filled($defaultCountryCode)) {
            $digits = $defaultCountryCode.$digits;
        }

        $length = strlen($digits);

        if ($length < 10 || $length > 15) {
            return null;
        }

        return $digits;
    }

    /**
     * The first valid WhatsApp-able phone on a student's record.
     */
    public static function studentPrimary(Student $student): ?string
    {
        foreach (self::studentNumbers($student) as $phone) {
            $normalized = self::normalize($phone);

            if ($normalized) {
                return $normalized;
            }
        }

        return null;
    }

    /**
     * Every distinct parent/guardian number on a student's record so a message
     * can reach all guardians, not just one.
     *
     * @return Collection<int, array{name: string, phone: string}>
     */
    public static function studentParents(Student $student): Collection
    {
        $candidates = [
            ['name' => (string) ($student->guardian_name ?? ''), 'phone' => (string) ($student->guardian_phone ?? '')],
            ['name' => (string) ($student->father_name ?? ''), 'phone' => (string) ($student->father_phone ?? '')],
            ['name' => (string) ($student->mother_name ?? ''), 'phone' => (string) ($student->mother_phone ?? '')],
        ];

        $seen = [];

        return collect($candidates)
            ->map(fn (array $candidate) => [
                'name' => $candidate['name'] ?: (string) $student->name,
                'phone' => self::normalize($candidate['phone']),
            ])
            ->filter(fn (array $candidate) => $candidate['phone'] !== null)
            ->filter(fn (array $candidate) => ! isset($seen[$candidate['phone']]) && ($seen[$candidate['phone']] = true))
            ->values();
    }

    public static function userPhone(User $user): ?string
    {
        return self::normalize((string) ($user->phone ?? ''));
    }

    /**
     * @return array<int, string>
     */
    private static function studentNumbers(Student $student): array
    {
        return [
            $student->phone,
            $student->father_phone,
            $student->mother_phone,
            $student->guardian_phone,
            $student->emergency_contact_phone,
        ];
    }
}