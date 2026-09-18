import { useState } from 'react';
import { Camera, ImagePlus, Loader2, ScanFace, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useLanguage } from '../../i18n/LanguageProvider';

type Candidate = {
    rank: number;
    score: number;
    student: {
        id: string;
        admission_no?: string;
        first_name: string;
        last_name: string;
        class?: string;
    };
};

type Attributes = {
    quality: string;
    gender: string;
    estimatedAge: number | null;
    description: string;
};

type FaceResult = {
    file: string;
    size: number;
    analysis: string;
    attributes: Attributes;
    candidates: Candidate[];
};

interface FaceSearchKioskProps {
    user: any;
    configured: boolean;
    mode: string;
    faceResults: FaceResult[] | null;
}

const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const qualityVariant = (quality: string) =>
    quality === 'good' ? 'default' : quality === 'average' ? 'secondary' : 'destructive';

const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

export default function FaceSearchKiosk({ user, configured, mode, faceResults }: FaceSearchKioskProps) {
    const { t } = useLanguage();
    const [photos, setPhotos] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

    const addPhotos = (files: File[]) => {
        const next = [...photos, ...files].slice(0, 5);
        setPhotos(next);

        Promise.all(next.map(fileToDataUrl)).then(setPreviews);
    };

    const removePhoto = (index: number) => {
        const next = photos.filter((_, i) => i !== index);
        setPhotos(next);
        Promise.all(next.map(fileToDataUrl)).then(setPreviews);
    };

    const openCamera = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            setStreamRef(stream);
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef) {
                    videoRef.srcObject = stream;
                    videoRef.play().catch(() => undefined);
                }
            }, 0);
        } catch {
            setCameraError('Camera access was denied or is unavailable.');
        }
    };

    const capture = () => {
        if (!videoRef) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.videoWidth;
        canvas.height = videoRef.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            addPhotos([file]);
        }, 'image/jpeg');

        setShowCamera(false);
        streamRef?.getTracks().forEach((track) => track.stop());
        setStreamRef(null);
    };

    const closeCamera = () => {
        setShowCamera(false);
        streamRef?.getTracks().forEach((track) => track.stop());
        setStreamRef(null);
    };

    const submit = () => {
        if (photos.length === 0) return;
        setProcessing(true);
        setCameraError(null);

        const formData = new FormData();
        photos.forEach((photo) => formData.append('photos[]', photo));

        router.post('/face-search/kiosk', formData, {
            preserveScroll: true,
            onSuccess: () => setPhotos([]),
            onFinish: () => setProcessing(false),
        });
    };

    const reset = () => {
        setPhotos([]);
        setPreviews([]);
        router.visit('/face-search/kiosk', { method: 'get', preserveScroll: true });
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6 p-6 lg:p-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <ScanFace className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        {t('Face Search Kiosk')}
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary">{t('AI-assisted candidate matching')}</Badge>
                        <Badge variant="outline">
                            {t('Mode:')}
                            {mode}
                        </Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t(
                            'Capture or upload up to 5 photos. The AI vision provider extracts age, gender and quality, then a heuristic matcher surfaces the most likely student records.',
                        )}
                    </p>
                </div>

                {!configured && (
                    <Alert variant="destructive">
                        <ScanFace className="h-4 w-4" />
                        <AlertTitle>{t('AI provider not configured')}</AlertTitle>
                        <AlertDescription>
                            {t(
                                'Configure an OpenAI-compatible vision-capable model in AI Assistant settings before running a kiosk search.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Camera className="h-4 w-4 text-indigo-500" />
                            {t('Photo queue (')}
                            {photos.length}/5)
                        </CardTitle>
                        <CardDescription>
                            {t('Use the camera capture or the file picker. Images are processed in-memory only.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            {previews.map((preview, index) => (
                                <div key={preview} className="relative">
                                    <img
                                        src={preview}
                                        alt={t('queued')}
                                        className="h-28 w-full rounded-md object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            ))}

                            <label
                                className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground transition ${
                                    photos.length >= 5 ? 'pointer-events-none opacity-40' : 'hover:border-indigo-400'
                                }`}
                            >
                                <ImagePlus className="size-5" />
                                <span className="text-xs">{t('Add photos')}</span>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => addPhotos(Array.from(event.target.files ?? []))}
                                />
                            </label>
                        </div>

                        {cameraError && <p className="text-sm text-red-500">{cameraError}</p>}

                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" onClick={openCamera}>
                                <Camera className="size-4" />
                                {t('Open camera')}
                            </Button>
                            <Button
                                type="button"
                                onClick={submit}
                                disabled={processing || photos.length === 0 || !configured}
                            >
                                {processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <ScanFace className="size-4" />
                                )}
                                {processing ? 'Analyzing…' : t('Analyze photos')}
                            </Button>
                            {faceResults && (
                                <Button type="button" variant="ghost" onClick={reset}>
                                    {t('Reset results')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {showCamera && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                        <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
                            <h2 className="mb-3 text-lg font-semibold">{t('Camera capture')}</h2>
                            <video
                                ref={setVideoRef}
                                className="mx-auto max-h-64 w-full rounded-md bg-black"
                                playsInline
                                muted
                                autoPlay
                            />

                            <div className="mt-4 flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={closeCamera}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="button" onClick={capture}>
                                    <Camera className="size-4" />
                                    {t('Capture still')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {faceResults && faceResults.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {faceResults.map((result, index) => {
                            const { t } = useLanguage();
                            return (
                                <Card key={`${result.file}-${index}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            {t('Photo')}
                                            {index + 1}
                                            <Badge variant="outline">{result.file}</Badge>
                                            <Badge variant="outline">{formatBytes(result.size)}</Badge>
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={qualityVariant(result.attributes.quality)}>
                                                {t('Quality:')}
                                                {result.attributes.quality}
                                            </Badge>
                                            <Badge variant="outline">
                                                {t('Gender:')}
                                                {result.attributes.gender}
                                            </Badge>
                                            {result.attributes.estimatedAge !== null && (
                                                <Badge variant="outline">
                                                    {t('Est. age:')}
                                                    {result.attributes.estimatedAge}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {result.attributes.description}
                                        </p>

                                        {result.candidates.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium uppercase text-gray-400">
                                                    {t('Likely candidates')}
                                                </p>
                                                {result.candidates.map((candidate) => (
                                                    <a
                                                        key={candidate.student.id}
                                                        href={`/students/${candidate.student.id}`}
                                                        className="flex items-center justify-between rounded-md border border-gray-200 p-3 text-sm transition hover:border-indigo-300 dark:border-gray-700"
                                                    >
                                                        <div>
                                                            <p className="font-medium">
                                                                {candidate.student.first_name}{' '}
                                                                {candidate.student.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {candidate.student.admission_no} ·{' '}
                                                                {candidate.student.class}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">{candidate.score}%</Badge>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <Alert>
                                                <AlertTitle>{t('No strong candidates')}</AlertTitle>
                                                <AlertDescription>
                                                    {t(
                                                        'The described attributes did not match any active student. Try a clearer, front-facing photo.',
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        <details className="text-xs text-gray-400">
                                            <summary className="cursor-pointer">{t('View raw analysis')}</summary>
                                            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                                                {result.analysis}
                                            </pre>
                                        </details>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
