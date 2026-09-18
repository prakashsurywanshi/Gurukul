<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ __('Session Expired — Gurukul') }}</title>
    <link rel="icon" href="/favicon.ico" />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Instrument Sans',system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
        .card{max-width:420px;width:100%;background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;text-align:center}
        .icon{width:56px;height:56px;border-radius:50%;background:rgba(251,191,36,0.12);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px}
        .icon svg{width:28px;height:28px;color:#fbbf24}
        h1{font-size:1.25rem;font-weight:600;margin-bottom:8px}
        p{font-size:0.875rem;color:#94a3b8;line-height:1.6;margin-bottom:24px}
        .btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 24px;border-radius:8px;font-size:0.875rem;font-weight:600;text-decoration:none;transition:all 0.2s}
        .btn-primary{background:#3b82f6;color:#fff;border:none;cursor:pointer}
        .btn-primary:hover{background:#2563eb}
        .btn-outline{background:transparent;color:#94a3b8;border:1px solid #334155;cursor:pointer;margin-left:8px}
        .btn-outline:hover{border-color:#64748b;color:#e2e8f0}
        .actions{display:flex;gap:8px;justify-content:center}
        .timer{font-size:0.75rem;color:#64748b;margin-top:16px}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        </div>
        <h1>{{ __('Session Expired') }}</h1>
        <p>{{ __('Your session has expired or the security token is no longer valid. Please log in again to continue.') }}</p>
        <div class="actions">
            <a href="/login" class="btn btn-primary" id="loginBtn">{{ __('Log In Again') }}</a>
            <button class="btn btn-outline" onclick="history.back()">{{ __('Go Back') }}</button>
        </div>
        <p class="timer" id="timer"></p>
    </div>
    <script>
        (function () {
            var seconds = 8;
            var timer = document.getElementById('timer');
            var loginBtn = document.getElementById('loginBtn');
            function tick() {
                if (seconds <= 0) {
                    window.location.href = '/login';
                    return;
                }
                timer.textContent = 'Redirecting to login in ' + seconds + 's...';
                seconds--;
                setTimeout(tick, 1000);
            }
            tick();
        })();
    </script>
</body>
</html>
