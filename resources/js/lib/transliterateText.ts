import { getCsrfToken } from './csrf';

export async function transliterateText(text: string): Promise<string> {
    const response = await fetch('/settings/transliterate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({ text }),
    });

    const payload = await response.json();
    return payload?.transliterated ?? text;
}
