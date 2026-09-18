import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

import { useLanguage } from '../../i18n/LanguageProvider';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove?: () => void;
    folder?: string;
    className?: string;
    label?: string;
}

export default function ImageUpload({ value, onChange, onRemove, folder, className = '', label }: ImageUploadProps) {
    const { t } = useLanguage();
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const upload = useCallback(
        async (file: File) => {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('image', file);
                if (folder) formData.append('folder', folder);
                const response = await axios.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                onChange(response.data.url);
            } catch {
                alert(t('Failed to upload image. Please try again.'));
            } finally {
                setIsUploading(false);
            }
        },
        [onChange, folder, t],
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) upload(file);
    };

    if (value) {
        return (
            <div className={`group relative overflow-hidden rounded-xl border border-slate-200 ${className}`}>
                <img src={value} alt="" className="h-40 w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-slate-50"
                    >
                        {t('Replace')}
                    </button>
                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-red-600"
                        >
                            {t('Remove')}
                        </button>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
        );
    }

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition ${
                isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
            } ${className}`}
        >
            {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            ) : (
                <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">{label || t('Click or drag to upload image')}</p>
                    <p className="text-xs text-slate-400">{t('JPG, PNG, WebP up to 10MB')}</p>
                </>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
    );
}
