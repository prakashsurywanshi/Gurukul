<?php

namespace Tests\Feature;

use App\Support\RolePermissionCatalog;
use Tests\TestCase;

class TransportMenuScopingTest extends TestCase
{
    private const TRANSPORT_FEATURES = [
        'Transport Management',
        'Transport Fee Collection',
        'Transport Device Settings',
    ];

    private const SELF_SERVICE_ITEMS = [
        'dashboard',
        'notifications',
        'my-profile',
        'profile',
        'my-leaves',
        'my-loans',
        'explore',
    ];

    public function test_transport_menu_items_list_the_transport_roles(): void
    {
        foreach ($this->transportItems() as $item) {
            $this->assertContains(
                'transport_manager',
                $item['roles'],
                "Menu item {$item['id']} must be available to the transport manager role.",
            );
        }
    }

    public function test_transport_features_do_not_leak_into_other_menu_groups(): void
    {
        $allowedGroups = ['transport', 'parent-portal'];

        foreach ($this->menuItems() as $item) {
            if (! in_array($item['feature'], self::TRANSPORT_FEATURES, true)) {
                continue;
            }

            if ($this->isPortalOnly($item)) {
                continue;
            }

            $this->assertContains(
                $item['group'],
                $allowedGroups,
                "Menu item {$item['id']} uses a transport feature outside the transport group.",
            );
        }
    }

    public function test_self_service_menu_items_list_driver_and_transport_manager(): void
    {
        $byId = collect($this->menuItems())->keyBy('id');

        foreach (self::SELF_SERVICE_ITEMS as $itemId) {
            $item = $byId->get($itemId);

            $this->assertNotNull($item, "Missing self-service menu item {$itemId}.");

            foreach (['driver', 'transport_manager'] as $role) {
                $this->assertContains(
                    $role,
                    $item['roles'],
                    "Self-service menu item {$itemId} must list {$role}.",
                );
            }
        }
    }

    public function test_transport_manager_defaults_only_grant_transport_and_self_service(): void
    {
        $granted = collect(RolePermissionCatalog::defaults()['Transport Manager'])
            ->filter(fn (array $flags) => ! empty($flags['view']))
            ->keys()
            ->sort()
            ->values()
            ->all();

        $this->assertSame(
            [
                'Dashboard Home',
                'Edit Profile',
                'My Leaves',
                'Profile',
                'Transport Device Settings',
                'Transport Fee Collection',
                'Transport Management',
            ],
            $granted,
        );
    }

    /**
     * @return array<int, array{group: string, id: string, feature: string, roles: array<int, string>}>
     */
    private function menuItems(): array
    {
        static $cache = null;

        if ($cache !== null) {
            return $cache;
        }

        $path = resource_path('js/Pages/sidebarMenu.ts');
        $source = file_get_contents($path);

        $this->assertIsString($source);

        $items = [];
        $group = '';

        $awaitingGroupId = false;

        foreach (preg_split('/\R/', $source) as $line) {
            if ($line === '    {') {
                $awaitingGroupId = true;

                continue;
            }

            if ($awaitingGroupId && preg_match("/^        id: '([a-z0-9-]+)',\$/", $line, $matches)) {
                $group = $matches[1];
                $awaitingGroupId = false;

                continue;
            }

            $awaitingGroupId = false;

            if (! preg_match("/^\s+id: '([a-z0-9_-]+)',\$/", $line, $matches)) {
                continue;
            }

            $itemId = $matches[1];
            $block = $this->readItemBlock($source, $itemId);

            $items[] = [
                'group' => $group,
                'id' => $itemId,
                'feature' => $this->stringField($block, 'feature') ?? '',
                'roles' => $this->listField($block, 'roles'),
            ];
        }

        $this->assertGreaterThan(300, count($items), 'Sidebar menu parsing looks broken.');

        return $cache = $items;
    }

    /**
     * @return array<int, array{group: string, id: string, feature: string, roles: array<int, string>}>
     */
    private function transportItems(): array
    {
        return array_values(array_filter($this->menuItems(), function (array $item) {
            return in_array($item['feature'], self::TRANSPORT_FEATURES, true)
                && ! $this->isPortalOnly($item);
        }));
    }

    private function isPortalOnly(array $item): bool
    {
        return $item['roles'] !== []
            && array_diff($item['roles'], ['student', 'parent']) === [];
    }

    private function readItemBlock(string $source, string $itemId): string
    {
        $start = strpos($source, "id: '{$itemId}',");

        $this->assertNotFalse($start);

        $blockStart = strrpos(substr($source, 0, $start), '{');
        $blockStart = $blockStart === false ? $start : $blockStart;

        $depth = 0;
        $length = strlen($source);

        for ($i = $blockStart; $i < $length; $i++) {
            if ($source[$i] === '{') {
                $depth++;
            } elseif ($source[$i] === '}') {
                $depth--;

                if ($depth === 0) {
                    return substr($source, $blockStart, $i - $blockStart + 1);
                }
            }
        }

        return '';
    }

    /**
     * @return array<int, string>
     */
    private function listField(string $block, string $field): array
    {
        if (preg_match("/{$field}: \[([^\]]*)\]/s", $block, $matches) !== 1) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn (string $value) => trim(trim($value), "' \t"),
            explode(',', $matches[1]),
        )));
    }

    private function stringField(string $block, string $field): ?string
    {
        if (preg_match("/{$field}: '([^']*)'/", $block, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }
}
