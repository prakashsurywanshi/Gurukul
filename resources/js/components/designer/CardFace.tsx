import { Badge } from '../../Pages/ui/badge';
import { Button } from '../../Pages/ui/button';
import { Download, School, UserRound } from 'lucide-react';
import { qrSvgToken } from '../../utils/qr';
import { useLanguage } from '../../i18n/LanguageProvider';
import { CardEntity, IdCardDesign, normalizeDesign } from './cardTypes';

interface CardFaceProps {
    design?: Partial<IdCardDesign> | null;
    entity: CardEntity;
    orgName: string;
    title?: string;
    coachLabel?: string;
    onDownloadPdf?: () => void;
}

export default function CardFace({
    design: designInput,
    entity,
    orgName,
    title,
    coachLabel,
    onDownloadPdf,
}: CardFaceProps) {
    const { t } = useLanguage();
    const design = normalizeDesign(designInput);
    const accent = design.primary_color;

    const infoCells: Array<{ label: string; value?: string | null; show: boolean }> = [
        { label: t('Student ID'), value: entity.idLabel, show: Boolean(entity.idLabel) },
        { label: t('Admission Number'), value: entity.admissionNo, show: design.show_admission_no && Boolean(entity.admissionNo) },
        { label: t('Class'), value: entity.classLabel, show: Boolean(entity.classLabel) },
        { label: t('Role'), value: entity.roleLabel, show: Boolean(entity.roleLabel) },
        { label: t('Phone'), value: entity.phone, show: Boolean(entity.phone) },
        { label: t('Gender'), value: entity.gender, show: Boolean(entity.gender) },
        { label: t('Blood Group'), value: entity.bloodGroup, show: design.show_blood_group && Boolean(entity.bloodGroup) },
        { label: t('Date of Birth'), value: entity.dob, show: design.show_dob && Boolean(entity.dob) },
    ].filter((cell) => cell.show);

    const showInitialBanner =
        !design.show_photo || !entity.photoUrl ? (
            <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accent}26` }}
            >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20">
                    <UserRound className="h-9 w-9" />
                </div>
            </div>
        ) : (
            <img
                src={entity.photoUrl}
                alt=""
                className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow"
            />
        );

    return (
        <div className="w-full">
            <div
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ${
                    design.layout === 'portrait' ? 'mx-auto max-w-sm' : ''
                }`}
            >
                <div className="px-5 py-4 text-white" style={{ backgroundColor: accent }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <School
                                className="h-9 w-9 shrink-0"
                                style={{ color: 'rgba(255,255,255,0.85)' }}
                            />
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.25em] text-white/80">
                                    {coachLabel ?? (title ? '' : t('Template'))}
                                </p>
                                <h2 className="mt-0.5 text-lg font-semibold leading-tight">
                                    {title || t('ID Card')}
                                </h2>
                                <p className="mt-0.5 truncate text-xs text-white/75">{orgName}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`space-y-4 p-5 ${design.layout === 'portrait' ? 'flex flex-col items-center text-center' : ''}`}>
                    <div className={`flex gap-4 ${design.layout === 'portrait' ? 'flex-col items-center' : 'items-center'}`}>
                        {design.show_photo ? showInitialBanner : null}
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-slate-900">{entity.name}</p>
                            {entity.email ? <p className="truncate text-sm text-slate-500">{entity.email}</p> : null}
                            {(entity.classLabel || entity.roleLabel) && (
                                <Badge className="mt-2" style={{ backgroundColor: accent }}>
                                    {entity.classLabel || entity.roleLabel}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {infoCells.length > 0 ? (
                        <div className={`grid gap-3 text-sm ${design.layout === 'portrait' ? 'w-full grid-cols-2' : 'grid-cols-2'}`}>
                            {infoCells.map((cell) => (
                                <div key={cell.label} className="rounded-xl bg-slate-50 p-3 text-left">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{cell.label}</p>
                                    <p className="mt-1 truncate font-semibold text-slate-900">{cell.value}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {design.show_guardian && entity.guardian ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-left text-sm" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}14` }}>
                            {t('Guardian:')} <span className="font-medium text-slate-900">{entity.guardian}</span>
                        </div>
                    ) : null}

                    {design.show_guardian && entity.address ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-left text-sm" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}14` }}>
                            {t('Address:')} <span className="font-medium text-slate-900">{entity.address}</span>
                        </div>
                    ) : null}

                    {design.show_qr && entity.qrToken ? (
                        <div className="flex flex-col items-center rounded-xl bg-slate-50 p-3">
                            <div
                                className="mx-auto"
                                dangerouslySetInnerHTML={{
                                    __html: qrSvgToken(entity.qrToken, 84),
                                }}
                            />
                            <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                                {t('Scan For Attendance')}
                            </p>
                        </div>
                    ) : null}

                    {onDownloadPdf ? (
                        <Button variant="outline" className="w-full gap-2" onClick={onDownloadPdf}>
                            <Download className="h-4 w-4" />
                            {t('Download as PDF')}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}