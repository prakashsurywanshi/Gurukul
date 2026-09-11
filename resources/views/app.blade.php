<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <title>Gurukul</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script>
        (function () {
            try {
                var theme = localStorage.getItem('gurukul-theme') || 'system';
                var dark = false;
                if (theme === 'dark') {
                    dark = true;
                } else if (theme === 'light') {
                    dark = false;
                } else {
                    dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                document.documentElement.classList.toggle('dark', dark);
                if (theme !== 'dark') {
                    document.documentElement.classList.toggle('light', theme === 'light');
                }
            } catch (e) {}
        })();
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body>
    @inertia
</body>
</html>
