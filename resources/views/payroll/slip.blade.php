<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payroll Slip - {{ $slip['staff']['name'] }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 24px; }
        .document { max-width: 820px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; padding: 28px; position: relative; overflow: hidden; background: #ffffff; }
        .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 56px; font-weight: 800; letter-spacing: 0.18em; color: rgba(15, 23, 42, 0.04); transform: rotate(-28deg); text-transform: uppercase; pointer-events: none; user-select: none; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px; position: relative; z-index: 1; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-logo { width: 64px; height: 64px; max-width: 64px; max-height: 64px; border-radius: 14px; object-fit: contain; border: 1px solid #cbd5e1; background: #ffffff; padding: 6px; box-sizing: border-box; }
        .brand-copy { display: flex; flex-direction: column; gap: 2px; }
        .school-name { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        .school-meta { margin: 0; color: #475569; font-size: 11px; line-height: 1.5; }
        .title-block { text-align: right; }
        .document-title { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
        .slip-no { margin: 4px 0 0; font-size: 12px; color: #1d4ed8; font-weight: 600; }
        .status { display: inline-block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155; background: #f8fafc; }
        .section { margin-top: 18px; position: relative; z-index: 1; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .row span { color: #475569; }
        .row strong { color: #0f172a; }
        table.earnings { width: 100%; border-collapse: collapse; margin-top: 10px; position: relative; z-index: 1; }
        table.earnings th, table.earnings td { border: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; font-size: 12px; }
        table.earnings th { background: #f1f5f9; font-weight: 600; color: #334155; }
        table.earnings td.amount { text-align: right; font-weight: 600; }
        .net { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; border: 2px solid #0f172a; border-radius: 10px; padding: 12px 16px; font-size: 16px; font-weight: 800; background: #eff6ff; position: relative; z-index: 1; }
        .words { margin-top: 12px; font-size: 12px; position: relative; z-index: 1; }
        .words strong { color: #0f172a; }
        .footer { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; position: relative; z-index: 1; }
        .generated { color: #94a3b8; font-size: 10px; }
        .signature { width: 190px; border-top: 1px solid #0f172a; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; }
        .print-btn { position: fixed; top: 16px; right: 16px; z-index: 10; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        @media print {
            body { margin: 0; }
            .document { border: none; border-radius: 0; padding: 16px; max-width: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Print Payslip</button>
    <div class="document">
        <div class="watermark">{{ $slip['organization']['name'] }}</div>
        <div class="header">
            <div class="brand">
                @if($slip['organization']['logo'])
                    <img src="{{ $slip['organization']['logo'] }}" alt="{{ $slip['organization']['name'] }} logo" class="brand-logo">
                @endif
                <div class="brand-copy">
                    <p class="school-name">{{ $slip['organization']['name'] }}</p>
                    @if($slip['organization']['address'])
                        <p class="school-meta">{{ $slip['organization']['address'] }}</p>
                    @endif
                    @if($slip['organization']['phone'])
                        <p class="school-meta">Phone: {{ $slip['organization']['phone'] }}</p>
                    @endif
                    @if($slip['organization']['email'])
                        <p class="school-meta">{{ $slip['organization']['email'] }}</p>
                    @endif
                </div>
            </div>
            <div class="title-block">
                <p class="document-title">Payroll Slip</p>
                <p class="slip-no">Slip No: {{ $slip['slip_no'] }}</p>
                <p class="slip-no">Month: {{ $slip['month'] }}</p>
                <div class="status">{{ $slip['status'] }}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Staff Details</div>
            <div class="grid">
                <div class="row"><span>Name</span><strong>{{ $slip['staff']['name'] }}</strong></div>
                <div class="row"><span>Email</span><strong>{{ $slip['staff']['email'] }}</strong></div>
                <div class="row"><span>Role</span><strong>{{ $slip['staff']['role'] }}</strong></div>
                <div class="row"><span>Designation</span><strong>{{ $slip['staff']['designation'] ?: '-' }}</strong></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Earning &amp; Deductions</div>
            <table class="earnings">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Type</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Base Pay</td>
                        <td>Earning</td>
                        <td class="amount">&#8377; {{ number_format((float) $slip['base_pay'], 2) }}</td>
                    </tr>
                    <tr>
                        <td>Allowance</td>
                        <td>Earning</td>
                        <td class="amount">&#8377; {{ number_format((float) $slip['allowance'], 2) }}</td>
                    </tr>
                    <tr>
                        <td>Deduction</td>
                        <td>Deduction</td>
                        <td class="amount">&#8377; {{ number_format((float) $slip['deduction'], 2) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="net">
            <span>Net Pay</span>
            <span>&#8377; {{ number_format((float) $slip['net_pay'], 2) }}</span>
        </div>
        <div class="words">
            <strong>Amount in words:</strong>
            {{ $slip['net_pay_words'] }} Rupees Only
        </div>

        <div class="footer">
            <span class="generated">Generated on {{ $slip['generated_at'] }}</span>
            <span class="signature">Authorized Signature</span>
        </div>
    </div>
</body>
</html>