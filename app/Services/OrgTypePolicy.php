<?php

namespace App\Services;

use App\Models\Organization;

class OrgTypePolicy
{
    public const COLLEGE_MODE_TYPES = ['college', 'coaching', 'university'];

    public function isCollegeMode(Organization $organization): bool
    {
        return in_array($organization->type, self::COLLEGE_MODE_TYPES, true);
    }

    public function supportsCourses(Organization $organization): bool
    {
        return $this->isCollegeMode($organization);
    }

    public function supportsSemesters(Organization $organization): bool
    {
        return in_array($organization->type, ['college', 'university'], true);
    }

    public function supportsMockTests(Organization $organization): bool
    {
        return $organization->type === 'coaching';
    }

    public function supportsPromotion(Organization $organization): bool
    {
        return $organization->type === 'school';
    }

    public function assertSupportsCourses(Organization $organization): void
    {
        if (! $this->supportsCourses($organization)) {
            abort(403, 'College mode is not enabled for this organization.');
        }
    }

    public function assertSupportsSemesters(Organization $organization): void
    {
        if (! $this->supportsSemesters($organization)) {
            abort(403, 'Semester mode is not enabled for this organization.');
        }
    }
}
