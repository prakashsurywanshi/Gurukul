# Install inertia react

composer require inertiajs/inertia-laravel

php artisan inertia:middleware
<!-- bootstrap/app.php -->
use App\Http\Middleware\HandleInertiaRequests;
$middleware->web(append: [
    HandleInertiaRequests::class,
]);


npm install react react-dom
npm install @inertiajs/react
npm install -D typescript @types/react @types/react-dom

npm install @vitejs/plugin-react

<!-- vite.config.js -->
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    laravel({
      input: 'resources/js/app.tsx',
      refresh: true,
    }),
    react(),
  ],
})

<!-- resources/js/app.tsx -->
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true }) as Record<string, any>
    return pages[`./Pages/${name}.tsx`].default
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})

<!-- resources/js/Pages/Home.tsx -->
export default function Home() {
  return (
    <div style={{ padding: "40px" }}>
      <h1>Inertia + React + TypeScript Working 🎉</h1>
    </div>
  );
}

<!-- resouurces/view/app.blade.php -->
<!DOCTYPE html>
<html>
<head>
    @viteReactRefresh
    @vite('resources/js/app.tsx')
</head>
<body>
    @inertia
</body>
</html>

<!-- routes/web.php -->
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});


<!-- Command to run jobs -->
php artisan queue:work database --queue=imports,whatsapp,default --tries=1 --timeout=900