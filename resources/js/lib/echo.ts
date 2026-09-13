import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

interface WindowWithEcho extends Window {
    Echo?: any;
    Pusher?: any;
}

let echoInstance: any = null;

export function createEcho(): any {
    if (echoInstance) {
        return echoInstance;
    }

    const win = window as WindowWithEcho;

    if (win.Echo) {
        echoInstance = win.Echo;

        return echoInstance;
    }

    const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;

    if (!key) {
        return null;
    }

    win.Pusher = win.Pusher ?? Pusher;
    echoInstance = new Echo({
        broadcaster: 'reverb',
        key,
        wsHost: (import.meta.env.VITE_REVERB_HOST as string | undefined) ?? '127.0.0.1',
        wsPort: Number((import.meta.env.VITE_REVERB_PORT as string | undefined) ?? '8080'),
        wssPort: Number((import.meta.env.VITE_REVERB_PORT as string | undefined) ?? '443'),
        forceTLS: ((import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
    });
    win.Echo = echoInstance;

    return echoInstance;
}
