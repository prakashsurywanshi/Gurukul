import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { AlertTriangle, Camera, FileQuestion, Loader2, ScanFace, Upload } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface FaceSearchProps {
    user: any;
    configured: boolean;
    mode: string;
    spike: boolean;
    faceResult: { file: string; size: number; analysis: string } | null;
}

const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function FaceSearch(pageProps: FaceSearchProps) {
    const { user, configured, mode, faceResult } = pageProps;
    const { data, setData, post, processing, errors } = useForm<{ photo: File | null }>({ photo: null });
    const [preview, setPreview] = useState<string | null>(null);

    const choosePhoto = (file: File | null) => {
        setData('photo', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post('/face-search');
    };

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        <ScanFace className="mr-2 inline-block h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        Face Search
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary">Spike preview</Badge>
                        <Badge variant="outline">Mode: {mode}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Experimental facial-detection pipeline that analyzes a photo for record-matching suitability.
                        This is a spike: it validates the vision path and pipeline shape before a production embedding
                        system is built.
                    </p>
                </div>

                <Alert variant={configured ? 'default' : 'destructive'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{configured ? `AI provider ready (${mode})` : 'AI provider not configured'}</AlertTitle>
                    <AlertDescription>
                        {configured
                            ? 'Vision requests will be sent to the configured model. Results are previews for suitability analysis.'
                            : 'Open AI Assistant settings and configure an OpenAI-compatible provider with a vision-capable model (e.g. gpt-4o-mini) to use Face Search.'}
                    </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Camera className="h-4 w-4 text-indigo-500" />
                                Upload a photo
                            </CardTitle>
                            <CardDescription>
                                JPEG, PNG or WebP up to 4 MB. The image is processed in-memory only.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <label
                                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition ${
                                        preview
                                            ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/5'
                                            : 'border-gray-300 hover:border-indigo-400 dark:border-gray-600'
                                    }`}
                                >
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="max-h-48 rounded-md object-cover" />
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-gray-400" />
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                Click to choose a photo
                                            </span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
                                    />
                                </label>

                                {errors.photo && <p className="text-sm text-red-500">{errors.photo}</p>}

                                <Button type="submit" disabled={processing || !data.photo} className="w-full">
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing…
                                        </>
                                    ) : (
                                        <>
                                            <ScanFace className="mr-2 h-4 w-4" />
                                            Analyze photo
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileQuestion className="h-4 w-4 text-indigo-500" />
                                Result
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {faceResult ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Badge variant="outline">{faceResult.file}</Badge>
                                        <Badge variant="outline">{formatBytes(faceResult.size)}</Badge>
                                    </div>
                                    <pre className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                                        {faceResult.analysis}
                                    </pre>
                                </div>
                            ) : (
                                <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700">
                                    No analysis yet. Upload a photo to begin.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Production roadmap (fallback plan)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            If the vision pipeline is unavailable, Face Search degrades gracefully to the manual student
                            search screen (
                            <a className="text-indigo-600 dark:text-indigo-400" href="/search_students">
                                Search Students
                            </a>
                            ), which continues to work without any AI dependency.
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>
                                Phase 1 (this spike): validate the AI vision provider contract and photo suitability.
                            </li>
                            <li>
                                Phase 2: capture and store face embeddings on student profiles using a local ONNX model.
                            </li>
                            <li>Phase 3: nearest-neighbour matching to surface candidate student records.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
