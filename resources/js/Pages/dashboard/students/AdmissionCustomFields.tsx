import React from 'react';
import { useLanguage } from '../../../i18n/LanguageProvider';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

export type AdmissionFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'select'
    | 'url'
    | 'email'
    | 'phone'
    | 'checkbox'
    | 'radio'
    | 'multi-select'
    | 'currency'
    | 'file';

export interface AdmissionCustomField {
    id: number;
    label: string;
    fieldKey: string;
    fieldType: AdmissionFieldType;
    options: string[];
    isRequired: boolean;
}

interface Props {
    fields: AdmissionCustomField[];
    values: Record<string, string | string[]>;
    onChange: (fieldKey: string, value: string | string[]) => void;
}

export default function AdmissionCustomFields({ fields, values, onChange }: Props) {
    const { t } = useLanguage();

    if (fields.length === 0) {
        return null;
    }

    const labelFor = (field: AdmissionCustomField) => `${field.label}${field.isRequired ? ' *' : ''}`;

    const current = (key: string): string => {
        const value = values[key];
        return typeof value === 'string' ? value : '';
    };

    const parseMulti = (key: string): string[] => {
        const value = Array.isArray(values[key]) ? values[key] : [];
        return value;
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => {
                const { fieldType } = field;
                const key = field.fieldKey;
                const label = t(labelFor(field));

                if (['text', 'number', 'date', 'url', 'email', 'phone', 'currency', 'file'].includes(fieldType)) {
                    return (
                        <div key={key} className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                                type={
                                    fieldType === 'number'
                                        ? 'number'
                                        : fieldType === 'currency'
                                          ? 'number'
                                          : fieldType === 'date'
                                            ? 'date'
                                            : fieldType === 'email'
                                              ? 'email'
                                              : fieldType === 'url'
                                                ? 'url'
                                                : 'text'
                                }
                                step={fieldType === 'currency' ? '0.01' : undefined}
                                inputMode={fieldType === 'phone' ? 'tel' : undefined}
                                placeholder={
                                    fieldType === 'file' ? '/uploads/… or https://…' : undefined
                                }
                                value={current(key)}
                                onChange={(e) => onChange(key, e.target.value)}
                            />
                        </div>
                    );
                }

                if (fieldType === 'textarea') {
                    return (
                        <div key={key} className="col-span-2 space-y-2">
                            <Label>{label}</Label>
                            <Textarea
                                rows={3}
                                value={current(key)}
                                onChange={(e) => onChange(key, e.target.value)}
                            />
                        </div>
                    );
                }

                if (fieldType === 'select') {
                    return (
                        <div key={key} className="space-y-2">
                            <Label>{label}</Label>
                            <Select
                                value={current(key) || undefined}
                                onValueChange={(value) => onChange(key, value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                }

                if (fieldType === 'radio') {
                    return (
                        <div key={key} className="space-y-2">
                            <Label>{label}</Label>
                            <div className="flex flex-wrap gap-3 pt-1">
                                {field.options.map((option) => (
                                    <label key={option} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name={key}
                                            value={option}
                                            checked={current(key) === option}
                                            onChange={() => onChange(key, option)}
                                            className="h-4 w-4"
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                }

                if (fieldType === 'multi-select') {
                    const selected = parseMulti(key);
                    return (
                        <div key={key} className="col-span-2 space-y-2">
                            <Label>{label}</Label>
                            <div className="flex flex-wrap gap-3 pt-1">
                                {field.options.map((option) => {
                                    const checked = selected.includes(option);
                                    return (
                                        <label key={option} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                    onChange(
                                                        key,
                                                        checked
                                                            ? selected.filter((value) => value !== option)
                                                            : [...selected, option],
                                                    )
                                                }
                                                className="h-4 w-4"
                                            />
                                            {option}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <label className="flex items-center gap-2 text-sm pt-1">
                            <input
                                type="checkbox"
                                checked={current(key) === '1'}
                                onChange={(e) => onChange(key, e.target.checked ? '1' : '0')}
                                className="h-4 w-4"
                            />
                            {t('Yes')}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}