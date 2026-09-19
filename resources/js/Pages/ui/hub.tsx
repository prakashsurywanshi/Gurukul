import React from 'react';
import { Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { Button } from './button';

export const formatMoney = (value?: number | null): string => {
    const amount = Number(value || 0);
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export function StatChip({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string | number;
    tone?: 'default' | 'success' | 'danger';
}) {
    const tones = {
        default: 'bg-slate-100 text-slate-900',
        success: 'bg-emerald-100 text-emerald-800',
        danger: 'bg-red-100 text-red-800',
    };

    return (
        <div className={`rounded-xl border border-slate-200 p-4 ${tones[tone]}`}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
    );
}

export function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="font-medium text-slate-900">{value ?? '-'}</p>
            </div>
        </div>
    );
}

export function OpenPageButton({ href, label }: { href: string; label: string }) {
    return (
        <Button asChild variant="outline" className="gap-2">
            <Link href={href}>
                <ExternalLink className="h-4 w-4" />
                {label}
            </Link>
        </Button>
    );
}
