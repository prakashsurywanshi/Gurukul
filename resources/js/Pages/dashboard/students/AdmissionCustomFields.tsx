import React from 'react';
import { useLanguage } from '../../../i18n/LanguageProvider';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

export interface AdmissionCustomField {
    id: number;
    label: string;
    fieldKey: string;
    fieldType: 'text' | 'textarea' | 'number' | 'date' | 'select';
    options: string[];
    isRequired: boolean;
}

interface Props {
    fields: AdmissionCustomField[];
    values: Record<string, string>;
    onChange: (fieldKey: string, value: string) => void;
}

export default function AdmissionCustomFields({ fields, values, onChange }: Props) {
    const { t } = useLanguage();

    if (fields.length === 0) {
        return null;
    }

    const labelFor = (field: AdmissionCustomField) => `${field.label}${field.isRequired ? ' *' : ''}`;

    return (
        <div className="grid grid-cols-2 gap-4">
            {fields.map((field) => {
                const label = t(labelFor(field));

                if (field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'date') {
                    return (
                        <div key={field.fieldKey} className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                                type={
                                    field.fieldType === 'number'
                                        ? 'number'
                                        : field.fieldType === 'date'
                                          ? 'date'
                                          : 'text'
                                }
                                value={values[field.fieldKey] ?? ''}
                                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                            />
                        </div>
                    );
                }

                if (field.fieldType === 'textarea') {
                    return (
                        <div key={field.fieldKey} className="space-y-2 col-span-2">
                            <Label>{label}</Label>
                            <Textarea
                                rows={3}
                                value={values[field.fieldKey] ?? ''}
                                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                            />
                        </div>
                    );
                }

                return (
                    <div key={field.fieldKey} className="space-y-2">
                        <Label>{label}</Label>
                        <Select
                            value={values[field.fieldKey] || undefined}
                            onValueChange={(value) => onChange(field.fieldKey, value)}
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
            })}
        </div>
    );
}
