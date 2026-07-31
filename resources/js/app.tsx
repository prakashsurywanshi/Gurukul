import { createRoot } from "react-dom/client";
import { createInertiaApp, router } from "@inertiajs/react";
import { useEffect } from "react";
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';

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
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true }) as Record<string, any>
    return pages[`./Pages/${name}.tsx`].default
  },
  setup({ el, App, props }) {
    createRoot(el).render(
    <ThemeProvider>
      <AppShell App={App} props={props} />
      <Toaster />
    </ThemeProvider>
    )
  },
})
