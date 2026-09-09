import { Keyboard, Loader2, Sparkles } from 'lucide-react';
import { useRef } from 'react';

import { useLanguage } from '../../i18n/LanguageProvider';
import { Button } from '../../Pages/ui/button';
import { Input } from '../../Pages/ui/input';
import { useRegionalKeyboard, type RegionalInputHandle } from './RegionalKeyboardProvider';

interface MarathiInputProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    fieldId?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    onAutoGenerate?: () => void;
    autoGenerating?: boolean;
}

export function MarathiInput({
    value,
    onChange,
    label,
    fieldId,
    placeholder,
    required,
    disabled,
    className,
    inputClassName,
    onAutoGenerate,
    autoGenerating,
}: MarathiInputProps) {
    const { t } = useLanguage();
    const { openKeyboard, closeKeyboard, activeId, isOpen } = useRegionalKeyboard();
    const inputRef = useRef<HTMLInputElement>(null);
    const id = fieldId ?? label ?? 'regional-field';

    const handleRef = useRef<RegionalInputHandle>({ id, label: label ?? id, inputRef, value, onChange });
    handleRef.current = { id, label: label ?? id, inputRef, value, onChange };

    const keyboardActive = activeId === id;

    const handleFocus = () => {
        // Never open the keyboard automatically on focus. Only retarget the
        // already-open keyboard when the user clicks into another regional field.
        if (isOpen && !keyboardActive) {
            openKeyboard(handleRef);
        }
    };

    const toggleKeyboard = () => {
        if (keyboardActive) {
            closeKeyboard();
            return;
        }
        openKeyboard(handleRef);
    };

    return (
        <div className={className}>
            <div className="flex gap-2">
                <Input
                    ref={inputRef}
                    value={value}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    onFocus={handleFocus}
                    onChange={(event) => {
                        onChange(event.target.value);
                    }}
                    className={inputClassName}
                />
                {onAutoGenerate ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={disabled || autoGenerating}
                        onClick={onAutoGenerate}
                        title={t('Auto-generate')}
                        aria-label={t('Auto-generate')}
                    >
                        {autoGenerating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4" />
                        )}
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant={keyboardActive ? 'default' : 'outline'}
                    size="icon"
                    className="shrink-0"
                    disabled={disabled}
                    onClick={toggleKeyboard}
                    title={t('On-screen keyboard')}
                    aria-label={t('On-screen keyboard')}
                >
                    <Keyboard className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
