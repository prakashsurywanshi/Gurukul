import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { useEffect, type ComponentType } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { RegionalKeyboardProvider } from './components/regional/RegionalKeyboardProvider';
import { LanguageProvider } from './i18n/LanguageProvider';

router.on('invalid', (event: any) => {
    if (event.detail?.response?.status === 419) {
        const current = window.location.pathname;
        if (!current.startsWith('/login')) {
            const next = `/login?expired=1&redirect=${encodeURIComponent(current + window.location.search)}`;
            window.location.replace(next);
        }
        return true;
    }
});

const pages = import.meta.glob('./Pages/**/*.tsx', {
    eager: true,
}) as Record<string, any>;

// Cache a single stable wrapper component per page name. Returning a fresh
// component instance on every visit makes Inertia treat each navigation as a
// different page, forcing a full remount (closing dialogs/popups and losing
// in-progress state) even when preserveState is active.
const pageWrappers = new Map<string, ComponentType<Record<string, unknown>>>();

function resolvePageWrapper(name: string): ComponentType<Record<string, unknown>> {
    let wrapper = pageWrappers.get(name);

    if (!wrapper) {
        const Page = pages[`./Pages/${name}.tsx`].default;
        wrapper = (props: Record<string, unknown>) => (
            <LanguageProvider>
                <RegionalKeyboardProvider>
                    <Page {...props} />
                </RegionalKeyboardProvider>
            </LanguageProvider>
        );
        pageWrappers.set(name, wrapper);
    }

    return wrapper;
}

function setFavicon(href?: string | null) {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const nextHref = href || '/favicon.ico';

    if (favicon) {
        favicon.href = nextHref;
        return;
    }

    const nextFavicon = document.createElement('link');
    nextFavicon.rel = 'icon';
    nextFavicon.href = nextHref;
    document.head.appendChild(nextFavicon);
}

function AppShell({ App, props }: { App: any; props: any }) {
    useEffect(() => {
        setFavicon(props.initialPage?.props?.schoolLogo);

        return router.on('navigate', (event: any) => {
            setFavicon(event.detail.page.props.schoolLogo);
        });
    }, [props.initialPage?.props?.schoolLogo]);

    return <App {...props} />;
}

createInertiaApp({
    resolve: resolvePageWrapper,
    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider>
                <AppShell App={App} props={props} />
                <Toaster />
            </ThemeProvider>,
        );
    },
});
