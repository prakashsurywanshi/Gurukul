import type { ReactNode } from 'react';
import { Save, X, Loader2 } from 'lucide-react';

interface SectionEditBarProps {
    sectionName?: string;
    sectionKey?: string;
    isDirty?: boolean;
    isSaving?: boolean;
    isEditing?: boolean;
    onSave?: () => void;
    onDiscard?: () => void;
    children?: ReactNode;
}

export default function SectionEditBar({
    sectionName,
    sectionKey,
    isDirty = false,
    isSaving = false,
    isEditing,
    onSave,
    onDiscard,
    children,
}: SectionEditBarProps) {
    if (isEditing === false) {
        return <>{children}</>;
    }

    const label = sectionName || sectionKey || 'Section';
    const canSave = !!onSave && !isSaving && (isDirty ?? isEditing ?? true);

    return (
        <div className="absolute inset-x-0 -top-12 z-50 flex items-center justify-between rounded-t-xl border border-b-0 border-blue-200 bg-white px-4 py-2 shadow-lg">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <div className="flex items-center gap-2">
                {isDirty && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Unsaved changes
                    </span>
                )}
                {onDiscard && (
                    <button
                        type="button"
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        Discard
                    </button>
                )}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!canSave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}
