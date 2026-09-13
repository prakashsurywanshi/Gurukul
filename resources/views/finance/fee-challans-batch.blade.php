<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fee Challans - Batch</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 24px; }
        .document { max-width: 820px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; padding: 28px; position: relative; overflow: hidden; background: #ffffff; }
        .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: 800; letter-spacing: 0.2em; color: rgba(15, 23, 42, 0.04); transform: rotate(-28deg); text-transform: uppercase; pointer-events: none; user-select: none; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px; position: relative; z-index: 1; }
        .brand { display: flex; align-items: center; gap: 14px; }
        .brand-logo { width: 64px; height: 64px; max-width: 64px; max-height: 64px; border-radius: 14px; object-fit: contain; border: 1px solid #cbd5e1; background: #ffffff; padding: 6px; box-sizing: border-box; }
        .brand-copy { display: flex; flex-direction: column; gap: 2px; }
        .school-name { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
        .school-meta { margin: 0; color: #475569; font-size: 11px; line-height: 1.5; }
        .title-block { text-align: right; }
        .document-title { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
        .challan-no { margin: 4px 0 0; font-size: 12px; color: #1d4ed8; font-weight: 600; }
        .section { margin-top: 18px; position: relative; z-index: 1; }
        .section-title { font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .row span { color: #475569; }
        .row strong { color: #0f172a; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; position: relative; z-index: 1; }
        table.items th, table.items td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; }
        table.items th { background: #f1f5f9; font-weight: 600; color: #334155; }
        table.items tr:nth-child(even) td { background: #f8fafc; }
        table.items td.amount { text-align: right; font-weight: 600; }
        .totals { margin-top: 14px; margin-left: auto; width: 320px; position: relative; z-index: 1; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 12px; }
        .total-row.net { font-weight: 800; font-size: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px; margin-top: 6px; }
        .words { margin-top: 12px; font-size: 12px; position: relative; z-index: 1; }
        .words strong { color: #0f172a; }
        .instructions { margin-top: 22px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #f8fafc; position: relative; z-index: 1; font-size: 11px; color: #475569; }
        .footer { margin-top: 22px; color: #94a3b8; font-size: 10px; text-align: center; position: relative; z-index: 1; }
        .batch-meta { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 20px; }
        .page-break { page-break-before: always; }
        .print-btn { position: fixed; top: 16px; right: 16px; z-index: 10; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        @media print {
            body { margin: 0; }
            .document { border: none; border-radius: 0; padding: 16px; max-width: none; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">Print Challans</button>
    <p class="batch-meta">{{ $organization['name'] }} &middot; {{ count($challans) }} challan(s) &middot; Generated {{ now()->format('d M Y, h:i A') }}</p>
    @foreach($challans as $index => $challan)
        @if($index > 0)
            <div class="page-break"></div>
        @endif
        <div class="document">
            <div class="watermark">{{ $organization['name'] }}</div>
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
                        @if($organization['email'])
                            <p class="school-meta">{{ $organization['email'] }}</p>
                        @endif
                    </div>
                </div>
                <div class="title-block">
                    <p class="document-title">Fee Challan</p>
                    <p class="challan-no">Challan No: {{ $challan['challan_number'] }}</p>
                    <p class="challan-no">Date: {{ $challan['issued_at'] }}</p>
                    <p class="challan-no">Due Date: {{ $challan['due_date'] }}</p>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Student Details</div>
                <div class="grid">
                    <div class="row"><span>Name</span><strong>{{ $challan['student']['name'] }}</strong></div>
                    <div class="row"><span>Admission No.</span><strong>{{ $challan['student']['admission_no'] ?: '-' }}</strong></div>
                    <div class="row"><span>Class</span><strong>{{ $challan['student']['class'] }}{{ $challan['student']['section'] ? '-' . $challan['student']['section'] : '' }}</strong></div>
                    <div class="row"><span>Roll Number</span><strong>{{ $challan['student']['roll_number'] ?: '-' }}</strong></div>
                    <div class="row"><span>Academic Session</span><strong>{{ $challan['session'] }}</strong></div>
                    <div class="row"><span>Fee Type</span><strong>{{ $challan['fee_type'] }}</strong></div>
                    <div class="row"><span>Frequency</span><strong>{{ ucfirst($challan['frequency']) }}</strong></div>
                    <div class="row"><span>Particulars</span><strong>{{ $challan['description'] ?: '-' }}</strong></div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Amount Details</div>
                <table class="items">
                    <thead>
                        <tr>
                            <th>Particulars</th>
                            <th style="width:140px">Due Date</th>
                            <th style="width:120px">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ $challan['fee_type'] }} Fee</td>
                            <td>{{ $challan['due_date'] }}</td>
                            <td class="amount">&#8377; {{ number_format($challan['fee']['amount'], 2) }}</td>
                        </tr>
                        @if((float) $challan['fee']['discount'] > 0)
                            <tr>
                                <td>Discount</td>
                                <td>-</td>
                                <td class="amount">- &#8377; {{ number_format($challan['fee']['discount'], 2) }}</td>
                            </tr>
                        @endif
                        @if((float) $challan['fee']['fine'] > 0)
                            <tr>
                                <td>Late Fine</td>
                                <td>-</td>
                                <td class="amount">+ &#8377; {{ number_format($challan['fee']['fine'], 2) }}</td>
                            </tr>
                        @endif
                    </tbody>
                </table>
                <div class="totals">
                    <div class="total-row"><span>Net Amount</span><strong>&#8377; {{ number_format($challan['fee']['net_amount'], 2) }}</strong></div>
                    <div class="total-row"><span>Already Paid</span><strong>&#8377; {{ number_format($challan['fee']['paid_amount'], 2) }}</strong></div>
                    <div class="total-row net"><span>Amount Due</span><span>&#8377; {{ number_format($challan['fee']['balance'], 2) }}</span></div>
                </div>
                <div class="words">
                    <strong>Amount Due in Words:</strong>
                    {{ $challan['amount_words'] }}
                </div>
            </div>

            <div class="section">
                <div class="instructions">
                    <strong>Payment Instructions:</strong>
                    Please pay the above due amount before the due date to avoid late fines. Payment can be made at the school accounts office in cash, by cheque, UPI, card, or online payment through the student portal. The school reserves the right to withhold examination/hall tickets for non-payment.
                </div>
                <div class="instructions" style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span>Generated by: {{ $challan['generated_by'] ?? 'System' }}</span>
                    <span>Authorised Signatory</span>
                </div>
            </div>

            <div class="footer">
                This is a computer-generated fee challan. &copy; {{ now()->year }} {{ $organization['name'] }}
            </div>
        </div>
    @endforeach
</body>
</html>