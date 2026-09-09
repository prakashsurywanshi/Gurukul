import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const pad = (value: number) => String(value).padStart(2, '0');

const normalizeDate = (value?: string | Date | null) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export function formatDate(value?: string | Date | null, fallback = '-') {
    const date = normalizeDate(value);

    if (!date) {
        return fallback;
    }

    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function formatDateTime(value?: string | Date | null, fallback = '-') {
    const date = normalizeDate(value);

    if (!date) {
        return fallback;
    }

    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';

    return `${formatDate(date, fallback)} ${pad(hours12)}:${pad(date.getMinutes())} ${meridiem}`;
}
