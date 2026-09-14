<?php

namespace App\Services;

use App\Models\CustomFieldDefinition;

class CustomFieldValueService
{
    public const ENTITIES = ['student', 'staff', 'lead', 'book', 'asset', 'inventory'];

    public const FIELD_TYPES = [
        'text',
        'textarea',
        'number',
        'date',
        'select',
        'url',
        'email',
        'phone',
        'checkbox',
        'radio',
        'multi-select',
        'currency',
        'file',
    ];

    public const OPTIONED_TYPES = ['select', 'radio', 'multi-select'];

    /**
     * Validate a single raw input for a field definition.
     *
     * @param mixed $input
     * @return array{value: mixed, error: ?string} normalized value (or unchanged) + error message.
     */
    public function validateForField(CustomFieldDefinition $field, $input): array
    {
        if ($field->is_required && $this->isEmpty($input)) {
            return ['value' => null, 'error' => 'The '.$field->label.' field is required.'];
        }

        if ($this->isEmpty($input)) {
            return ['value' => null, 'error' => null];
        }

        $typeError = $this->typeError($field, $input);

        if ($typeError) {
            return ['value' => null, 'error' => 'The '.$field->label.' field is invalid.'];
        }

        $ruleError = $this->ruleError($field, $input);

        if ($ruleError) {
            return ['value' => null, 'error' => $ruleError];
        }

        return ['value' => $this->normalize($field, $input), 'error' => null];
    }

    /**
     * Validate a full keyed submission for a definition collection.
     *
     * @param \Illuminate\Support\Collection<int, CustomFieldDefinition> $fields
     * @param array<string, mixed> $submitted
     * @param string $errorPrefix prefix for error keys (e.g. 'values' or 'custom_fields')
     * @return array{errors: array<string, string>, normalized: array<CustomFieldDefinition, mixed>}
     */
    public function validateForFields($fields, array $submitted, string $errorPrefix = 'values'): array
    {
        $errors = [];
        $normalized = [];

        foreach ($fields as $field) {
            $input = $submitted[$field->field_key] ?? null;

            if (is_array($input) && ! in_array($field->field_type, ['multi-select'], true)) {
                $input = null;
            }

            $result = $this->validateForField($field, $input);

            if ($result['error']) {
                $errors[$errorPrefix.'.'.$field->field_key] = $result['error'];
            }

            $normalized[$field->id] = $result['value'];
        }

        return ['errors' => $errors, 'normalized' => $normalized];
    }

    public function isEmpty($input): bool
    {
        return blank($input) && $input !== false && $input !== 0 && $input !== '0';
    }

    /**
     * @param mixed $input
     */
    private function typeError(CustomFieldDefinition $field, $input): bool
    {
        return match ($field->field_type) {
            'number' => ! is_numeric($input),
            'currency' => ! is_numeric($input),
            'date' => ! (bool) strtotime($input),
            'select', 'radio' => ! is_string($input) || ! in_array($input, $field->options ?? [], true),
            'multi-select' => ! is_array($input) || collect($input)->contains(fn ($value) => ! is_string($value)) || collect($input)->contains(fn ($value) => ! in_array($value, $field->options ?? [], true)),
            'checkbox' => ! in_array($input, [0, 1, '0', '1', true, false, 'on', 'off'], true),
            'email' => filter_var($input, FILTER_VALIDATE_EMAIL) === false,
            'url' => filter_var($input, FILTER_VALIDATE_URL) === false,
            'phone' => preg_match('/^[0-9+\-\s()]+$/', (string) $input) !== 1
                || strlen(preg_replace('/\D/', '', (string) $input)) < 7,
            'file' => filter_var($input, FILTER_VALIDATE_URL) === false &&
                $this->looksLikeRelativePath((string) $input) === false,
            default => false,
        };
    }

    /**
     * Enforce min/max/pattern rules after the type check passes.
     *
     * @param mixed $input
     */
    private function ruleError(CustomFieldDefinition $field, $input): ?string
    {
        $label = $field->label;

        if (in_array($field->field_type, ['number', 'currency'], true)) {
            $value = (float) $input;

            if ($field->min_value !== null && $value < (float) $field->min_value) {
                return 'The '.$label.' field must be at least '.number_format((float) $field->min_value, 2).'.';
            }

            if ($field->max_value !== null && $value > (float) $field->max_value) {
                return 'The '.$label.' field must not be greater than '.number_format((float) $field->max_value, 2).'.';
            }
        }

        if (in_array($field->field_type, ['text', 'textarea', 'url', 'email', 'phone', 'file'], true)) {
            $length = mb_strlen((string) $input);

            if ($field->min_length !== null && $length < $field->min_length) {
                return 'The '.$label.' field must be at least '.$field->min_length.' characters.';
            }

            if ($field->max_length !== null && $length > $field->max_length) {
                return 'The '.$label.' field must not be longer than '.$field->max_length.' characters.';
            }

            if ($field->pattern && $field->field_type !== 'file' && @preg_match($field->pattern, (string) $input) !== 1) {
                return $field->pattern_message ?: 'The '.$label.' field format is invalid.';
            }
        }

        return null;
    }

    /**
     * Normalize a valid input to its canonical stored representation.
     *
     * @param mixed $input
     * @return mixed
     */
    private function normalize(CustomFieldDefinition $field, $input)
    {
        return match ($field->field_type) {
            'number' => (string) ((float) $input),
            'currency' => number_format((float) $input, 2, '.', ''),
            'date' => date('Y-m-d', strtotime($input)),
            'checkbox' => in_array($input, [true, 1, '1', 'on'], true) ? '1' : '0',
            'multi-select' => is_array($input) ? json_encode(array_values($input)) : $input,
            default => $input,
        };
    }

    private function looksLikeRelativePath(string $value): bool
    {
        if (! str_starts_with($value, '/') && ! str_starts_with($value, './') && ! str_starts_with($value, 'uploads/')) {
            return false;
        }

        return strlen($value) <= 255;
    }
}