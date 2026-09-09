import { Delete, Eraser, Save, X } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
    type ReactNode,
} from 'react';

import { useLanguage } from '../../i18n/LanguageProvider';
import { Button } from '../../Pages/ui/button';
import { Input } from '../../Pages/ui/input';
import { DEVANAGARI_LAYOUT } from './keyboardData';

export interface RegionalInputHandle {
    id: string;
    label: string;
    inputRef: MutableRefObject<HTMLInputElement | null>;
    value: string;
    onChange: (value: string) => void;
}

export type RegionalInputHandleRef = MutableRefObject<RegionalInputHandle>;

interface RegionalKeyboardContextValue {
    openKeyboard: (handleRef: RegionalInputHandleRef) => void;
    closeKeyboard: () => void;
    isOpen: boolean;
    activeId: string | null;
}

const RegionalKeyboardContext = createContext<RegionalKeyboardContextValue | null>(null);

export function useRegionalKeyboard(): RegionalKeyboardContextValue {
    const context = useContext(RegionalKeyboardContext);
    if (!context) {
        throw new Error('useRegionalKeyboard must be used within RegionalKeyboardProvider');
    }
    return context;
}

function FixedKeyboard({ handleRef, onClose }: { handleRef: RegionalInputHandleRef; onClose: () => void }) {
    const { t } = useLanguage();
    const headerInputRef = useRef<HTMLInputElement>(null);
    const editingHeaderRef = useRef(false);
    const [draft, setDraft] = useState(handleRef.current.value);

    useEffect(() => {
        setDraft(handleRef.current.value);
        const source = handleRef.current.inputRef.current;
        const onSourceFocus = () => {
            editingHeaderRef.current = false;
        };
        editingHeaderRef.current = false;
        source?.addEventListener('focus', onSourceFocus);
        return () => source?.removeEventListener('focus', onSourceFocus);
    }, [handleRef]);

    const commit = (next: string) => {
        handleRef.current.onChange(next);
        setDraft(next);
    };

    const activeTarget = (): HTMLInputElement | null => {
        if (editingHeaderRef.current) {
            return headerInputRef.current;
        }
        return handleRef.current.inputRef.current;
    };

    const insert = (text: string) => {
        const editingHeader = editingHeaderRef.current;
        const input = activeTarget();
        const source = editingHeader ? draft : handleRef.current.value;
        const cursor = input?.selectionStart ?? source.length;
        const next = `${source.slice(0, cursor)}${text}${source.slice(cursor)}`;
        const nextCursor = cursor + text.length;
        commit(next);
        requestAnimationFrame(() => {
            input?.focus();
            input?.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const backspace = () => {
        const editingHeader = editingHeaderRef.current;
        const input = activeTarget();
        const source = editingHeader ? draft : handleRef.current.value;
        const cursor = input?.selectionStart ?? source.length;
        if (cursor <= 0) {
            return;
        }
        const next = `${source.slice(0, cursor - 1)}${source.slice(cursor)}`;
        const nextCursor = Math.max(0, cursor - 1);
        commit(next);
        requestAnimationFrame(() => {
            input?.focus();
            input?.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const clear = () => {
        commit('');
        requestAnimationFrame(() => {
            activeTarget()?.focus();
        });
    };

    const save = () => {
        onClose();
        requestAnimationFrame(() => {
            handleRef.current.inputRef.current?.focus();
        });
    };

    const current = handleRef.current;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-2 pb-2">
            <div className="w-full max-w-md overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-[0_-8px_40px_rgba(8,19,31,0.18)]">
                <div className="space-y-1.5 border-b border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{current.label}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-7 w-7 shrink-0"
                            onClick={onClose}
                            title={t('Close')}
                            aria-label={t('Close')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-1.5">
                        <Input
                            ref={headerInputRef}
                            value={draft}
                            placeholder={t('Type here…')}
                            className="h-9"
                            autoFocus
                            onFocus={() => {
                                editingHeaderRef.current = true;
                            }}
                            onChange={(event) => commit(event.target.value)}
                        />
                        <Button type="button" className="h-9 shrink-0 gap-1.5 px-4" onClick={save}>
                            <Save className="h-4 w-4" />
                            {t('Save')}
                        </Button>
                    </div>
                </div>

                <div className="max-h-[17rem] space-y-2 overflow-y-auto px-3 pb-2 pt-3">
                    {DEVANAGARI_LAYOUT.map((row, rowIndex) => (
                        <div key={rowIndex}>
                            {row.label ? (
                                <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                                    {row.label}
                                </div>
                            ) : null}
                            <div
                                className="grid gap-1.5"
                                style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }}
                            >
                                {row.keys.map((key, index) => (
                                    <Button
                                        key={`${key.value}-${index}`}
                                        type="button"
                                        variant="outline"
                                        className="h-8 rounded-md px-0 text-base"
                                        onClick={() => insert(key.value)}
                                    >
                                        {key.value}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 border-t border-slate-100 px-3 py-2">
                    <Button type="button" variant="outline" className="h-9 text-sm" onClick={() => insert(' ')}>
                        {t('Space')}
                    </Button>
                    <Button type="button" variant="outline" className="h-9 text-sm" onClick={backspace}>
                        <span className="flex items-center gap-1">
                            <Delete className="h-4 w-4" />
                            {t('Backspace')}
                        </span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-12"
                        onClick={clear}
                        title={t('Clear')}
                        aria-label={t('Clear')}
                    >
                        <Eraser className="h-4 w-4" />
                    </Button>
                    <Button type="button" className="h-9 shrink-0 gap-1.5 px-4" onClick={save}>
                        <Save className="h-4 w-4" />
                        {t('Save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function RegionalKeyboardProvider({ children }: { children: ReactNode }) {
    const [activeHandleRef, setActiveHandleRef] = useState<RegionalInputHandleRef | null>(null);

    const openKeyboard = useCallback((handleRef: RegionalInputHandleRef) => {
        setActiveHandleRef(handleRef);
    }, []);

    const closeKeyboard = useCallback(() => setActiveHandleRef(null), []);

    return (
        <RegionalKeyboardContext.Provider
            value={{
                openKeyboard,
                closeKeyboard,
                isOpen: activeHandleRef !== null,
                activeId: activeHandleRef?.current?.id ?? null,
            }}
        >
            {children}
            {activeHandleRef ? (
                <FixedKeyboard key={activeHandleRef.current.id} handleRef={activeHandleRef} onClose={closeKeyboard} />
            ) : null}
        </RegionalKeyboardContext.Provider>
    );
}
