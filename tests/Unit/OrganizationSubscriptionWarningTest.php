<?php

namespace Tests\Unit;

use App\Models\Organization;
use Tests\TestCase;

class OrganizationSubscriptionWarningTest extends TestCase
{
    public function test_it_returns_warning_message_when_expiry_is_within_ten_days(): void
    {
        $organization = new Organization([
            'status' => 'active',
            'subscription_end_date' => now()->addDays(5)->toDateString(),
        ]);

        $this->assertTrue($organization->expiresWithinDays(10));
        $this->assertNotNull($organization->expiryWarningMessage(10));
    }

    public function test_it_does_not_return_warning_message_when_expiry_is_outside_ten_days(): void
    {
        $organization = new Organization([
            'status' => 'active',
            'subscription_end_date' => now()->addDays(15)->toDateString(),
        ]);

        $this->assertFalse($organization->expiresWithinDays(10));
        $this->assertNull($organization->expiryWarningMessage(10));
    }
}
