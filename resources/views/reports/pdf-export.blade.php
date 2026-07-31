<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $report['label'] }} Report</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 20px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 12px; margin-bottom: 20px; }
        .stats { display: flex; gap: 16px; margin-bottom: 20px; }
        .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1; }
        .stat-label { color: #64748b; font-size: 11px; }
        .stat-value { font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; }
        th { background: #f1f5f9; font-weight: 600; color: #334155; }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer { margin-top: 20px; color: #94a3b8; font-size: 10px; text-align: center; }
    </style>
</head>
<body>
    <h1>{{ $report['label'] }} Report</h1>
    <p class="subtitle">{{ $report['description'] }} | Generated: {{ $generatedAt }}</p>

    <div class="stats">
        @foreach($report['stats'] as $stat)
            <div class="stat-card">
                <div class="stat-label">{{ $stat['label'] }}</div>
                <div class="stat-value">{{ $stat['value'] }}</div>
            </div>
        @endforeach
    </div>

    @if(count($report['rows']) > 0)
        <table>
            <thead>
                <tr>
                    @foreach($report['columns'] as $column)
                        <th>{{ $column }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($report['rows'] as $row)
                    <tr>
                        @foreach($row as $cell)
                            <td>{{ $cell }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p style="text-align: center; color: #94a3b8; padding: 40px;">No records found.</p>
    @endif

    <div class="footer">
        {{ $organization->name ?? 'School' }} | {{ $report['label'] }} Report | Page 1
    </div>
</body>
</html>
