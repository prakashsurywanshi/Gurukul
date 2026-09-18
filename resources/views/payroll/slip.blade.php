<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('Payroll Slip') }} - {{ $slip['staff']['name'] }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Noto+Sans+Devanagari:wght@400..700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Instrument Sans', Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 24px; }
        .document { max-width: 820px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; padding: 28px; position: relative; overflow: hidden; background: #ffffff; }
        .print-btn { position: fixed; top: 16px; right: 16px; z-index: 10; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 56px; font-weight: 800; letter-spacing: 0.18em; color: rgba(15, 23, 42, 0.04); transform: rotate(-28deg); text-transform: uppercase; pointer-events: none; user-select: none; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand img { width: 56px; height: 56px; border-radius: 12px; object-fit: contain; border: 1px solid #e2e8f0; }
        .school-name { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
        .school-meta { margin: 2px 0 0; color: #64748b; font-size: 11px; line-height: 1.5; }
        .title-block { text-align: right; }
        .doc-title { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
        .slip-no { margin: 4px 0 0; font-size: 12px; color: #1d4ed8; font-weight: 600; }
        .status { display: inline-block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155; background: #f8fafc; }
        .section { margin-top: 20px; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .row span { color: #475569; }
        .row strong { color: #0f172a; }
        table.earnings { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.earnings th, table.earnings td { border: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; font-size: 12px; }
        table.earnings th { background: #f1f5f9; font-weight: 600; color: #334155; }
        table.earnings td.amount { text-align: right; font-weight: 600; }
        .net { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; border-radius: 10px; padding: 12px 16px; font-size: 16px; font-weight: 800; background: #eff6ff; }
        .words { margin-top: 12px; font-size: 12px; }
        .words strong { color: #0f172a; }
        .footer { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
        .generated { color: #94a3b8; font-size: 10px; }
        .signature { width: 190px; border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; }
        @media print { body { margin: 0; } .print-btn { display: none; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">{{ __('Print Payroll Slip') }}</button>
    <div class="document">
        <div class="watermark">{{ $slip['organization']['name'] }}</div>
        <div class="header">
            <div class="brand">
                @if($slip['organization']['logo'])
                    <img src="{{ $slip['organization']['logo'] }}" alt="{{ $slip['organization']['name'] }} logo">
                @endif
                <div class="brand-copy">
                    <p class="school-name">{{ $slip['organization']['name'] }}</p>
                    <p class="school-meta">{{ $slip['organization']['address'] }}</p>
                    @if($slip['organization']['phone'])
                        <p class="school-meta">{{ __('Phone:') }} {{ $slip['organization']['phone'] }}</p>
                    @endif
                </div>
            </div>
            <div class="title-block">
                <p class="doc-title">{{ __('Payroll Slip') }}</p>
                <p class="slip-no">{{ __('Slip No:') }} {{ $slip['slip_no'] }}</p>
                <p class="slip-no">{{ __('Month:') }} {{ $slip['month'] }}</p>
                <span class="status">{{ $slip['status'] }}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">{{ __('Staff Details') }}</div>
            <div class="grid">
                <label>{{ __('Name') }}</label>
                <strong>{{ $slip['staff']['name'] }}</strong>
                <label>{{ __('Designation') }}</label>
                <strong>{{ $slip['staff']['designation'] ?? '-' }}</strong>
                <label>{{ __('Department') }}</label>
                <strong>{{ $slip['staff']['department'] ?? '-' }}</strong>
                <label>{{ __('Staff ID') }}</label>
                <strong>{{ $slip['staff']['staff_id'] }}</strong>
                <label>{{ __('Bank Account') }}</label>
                <strong>{{ $slip['staff']['bank_account'] ?? '-' }}</strong>
                <label>{{ __('UAN') }}</label>
                <strong>{{ $slip['staff']['uan'] ?? '-' }}</strong>
            </div>
        </div>

        <div class="section">
            <div class="section-title">{{ __('Earnings & Deductions') }}</div>
            <table class="earnings">
                <thead>
                    <tr>
                        <th>{{ __('Description') }}</th>
                        <th style="text-align: right;">{{ __('Amount') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($slip['earnings'] as $earning)
                        <tr>
                            <td>{{ $earning['description'] }}</td>
                            <td class="amount">&#8377; {{ number_format((float) $earning['amount'], 2) }}</td>
                        </tr>
                    @endforeach
                    @foreach($slip['deductions'] as $deduction)
                        <tr>
                            <td>{{ $deduction['description'] }}</td>
                            <td class="amount">- &#8377; {{ number_format((float) $deduction['amount'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="net">
            <span>{{ __('Net Pay') }}</span>
            <span>&#8377; {{ number_format((float) $slip['net_pay'], 2) }}</span>
        </div>
        <div class="words">
            <strong>{{ __('Amount in words:') }}</strong>
            {{ $slip['net_pay_words'] }} {{ __('Rupees Only') }}
        </div>

        <div class="footer">
            <span class="generated">{{ __('Generated on') }} {{ $slip['generated_at'] }}</span>
            <div class="signature">{{ __('Authorized Signature') }}</div>
        </div>
    </div>
    <script>
        (function () {
            var btn = document.querySelector('.print-btn');
            if (btn) btn.addEventListener('click', function () { window.print(); });
        })();
    </script>
</body>
</html>
