<?php

namespace App\Services\Approvals;

use InvalidArgumentException;

class ApprovalModuleRegistry
{
    /**
     * @var array<string, ApprovalModuleHandler>
     */
    private array $resolved = [];

    public function __construct(array $handlers)
    {
        $this->handlers = $handlers;
    }

    /**
     * @var array<string, class-string<ApprovalModuleHandler>>
     */
    private array $handlers;

    public function handlerFor(string $module): ?ApprovalModuleHandler
    {
        $class = $this->handlers[$module] ?? null;

        if (! $class) {
            return null;
        }

        if (! isset($this->resolved[$module])) {
            $this->resolved[$module] = app($class);
        }

        return $this->resolved[$module];
    }

    /**
     * @return array<string, ApprovalModuleHandler>
     */
    public function all(): array
    {
        foreach (array_keys($this->handlers) as $module) {
            $this->handlerFor($module);
        }

        return $this->resolved;
    }

    public function assertModule(string $module): void
    {
        if (! isset($this->handlers[$module])) {
            throw new InvalidArgumentException('Unknown approval module ['.$module.'].');
        }
    }
}