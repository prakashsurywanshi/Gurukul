<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Due Slip - {{ $student['name'] }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 24px; }
        .document { max-width: 820px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; padding: 28px; background: #ffffff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-logo { width: 64px; height: 64px; max-width: 64px; max-height: 64px; border-radius: 14px; object-fit: contain; border: 1px solid #cbd5e1; background: #ffffff; padding: 6px; box-sizing: border-box; }
        .school-name { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        .school-meta { margin: 0; color: #475569; font-size: 11px; line-height: 1.5; }
        .title-block { text-align: right; }
        .document-title { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
        .meta-line { margin: 4px 0 0; font-size: 12px; color: #475569; }
        .section { margin-top: 18px; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .row span { color: #475569; }
        .row strong { color: #0f172a; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th, table.items td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; }
        table.items th { background: #f1f5f9; font-weight: 600; color: #334155; }
        table.items tr:nth-child(even) td { background: #f8fafc; }
        table.items td.amount { text-align: right; font-weight: 600; }
        .summary { margin-top: 14px; display: flex; gap: 14px; justify-content: flex-end; }
        .summary-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; text-align: center; background: #f8fafc; }
        .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
        .summary-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
        .total-due { text-align: right; margin-top: 10px; font-size: 14px; font-weight: 800; }
        .note { margin-top: 16px; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; background: #fffbeb; font-size: 11px; color: #78350f; }
        .footer { margin-top: 22px; color: #94a3b8; font-size: 10px; text-align: center; }
        .print-btn { position: fixed; top: 16px; right: 16px; z-index: 10; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        @media print {
            body { margin: 0; }
            .document { border: none; border-radius: 0; padding: 16px; max-width: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Print Due Slip</button>
    <div class="document">
        <div class="header">
            <div class="brand">
                @if($organization['logo'])
                    <img src="{{ $organization['logo'] }}" alt="{{ $organization['name'] }} logo" class="brand-logo">
                @endif
                <div class="brand-copy">
                    <p class="school-name">{{ $organization['name'] }}</p>
                    @if($organization['address'])
                        <p class="school-meta">{{ $organization['address'] }}</p>
                    @endif
                    @if($organization['phone'])
                        <p class="school-meta">Phone: {{ $organization['phone'] }}</p>
                    @endif
                </div>
            </div>
            <div class="title-block">
                <p class="document-title">Fee Due Slip</p>
                <p class="meta-line">Generated: {{ $generated_at }}</p>
                <p class="meta-line">Session: {{ $session }}</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Student Details</div>
            <div class="grid">
                <div class="row"><span>Name</span><strong>{{ $student['name'] }}</strong></div>
                <div class="row"><span>Admission No.</span><strong>{{ $student['admission_no'] ?: '-' }}</strong></div>
                <div class="row"><span>Class</span><strong>{{ $student['class'] }}{{ $student['section'] ? '-' . $student['section'] : '' }}</strong></div>
                <div class="row"><span>Roll Number</span><strong>{{ $student['roll_number'] ?: '-' }}</strong></div>
                @if($student['father_name'])
                    <div class="row"><span>Father's Name</span><strong>{{ $student['father_name'] }}</strong></div>
                @endif
                @if($student['phone'])
                    <div class="row"><span>Contact</span><strong>{{ $student['phone'] }}</strong></div>
                @endif
            </div>
        </div>

        @if(count($pending_fees) === 0)
            <div class="section">
                <div class="section-title">Pending Fees</div>
                <p style="color:#047857; font-weight:600;">No pending fees for this session.</p>
            </div>
        @else
            <div class="section">
                <div class="section-title">Pending Fees</div>
                <table class="items">
                    <thead>
                        <tr>
                            <th>Fee Type</th>
                            <th>Particulars</th>
                            <th>Due Date</th>
                            <th>Net Amount</th>
                            <th>Paid</th>
                            <th style="width:110px">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($pending_fees as $fee)
                            <tr>
                                <td>{{ $fee['fee_type'] }}</td>
                                <td>{{ $fee['description'] ?: '-' }}</td>
                                <td>{{ $fee['due_date'] }}</td>
                                <td class="amount">&#8377; {{ number_format($fee['net_amount'], 2) }}</td>
                                <td class="amount">&#8377; {{ number_format($fee['paid_amount'], 2) }}</td>
                                <td class="amount">&#8377; {{ number_format($fee['balance'], 2) }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
                <div class="summary">
                    <div class="summary-box">
                        <div class="summary-label">Total Due</div>
                        <div class="summary-value">&#8377; {{ number_format($total_due, 2) }}</div>
                    </div>
                </div>
                <div class="total-due">Amount Due in Words: {{ $amount_words }}</div>
            </div>

            <div class="note">
                Kindly clear the above dues at the earliest. Pending fees must be paid before examinations to avoid withholding of hall tickets and result-related documents.
            </div>
        @endif

        <div class="footer">
            This is a computer-generated due slip. &copy; {{ now()->year }} {{ $organization['name'] }}
        </div>
    </div>
</body>
</html>