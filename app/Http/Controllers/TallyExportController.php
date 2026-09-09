<?php

namespace App\Http\Controllers;

use App\Models\FeePayment;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Throwable;

class TallyExportController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        [$from, $to] = $this->resolveDateRange($request);

        $receipts = $this->receipts($organization, $from, $to);

        return inertia('dashboard/TallyExport', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'receipts' => $receipts,
            'from' => $from->format('Y-m-d'),
            'to' => $to->format('Y-m-d'),
            'totalCollected' => round(collect($receipts)->sum('amount'), 2),
            'receiptCount' => count($receipts),
            'settings' => $this->tallySettings($organization),
        ]);
    }

    public function exportCsv(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        [$from, $to] = $this->resolveDateRange($request);

        $receipts = $this->receipts($organization, $from, $to);

        $filename = sprintf('tally-receipts-%s-to-%s.csv', $from->format('Y-m-d'), $to->format('Y-m-d'));

        $handle = fopen('php://temp', 'w+');
        fputcsv($handle, ['Date', 'Voucher Type', 'Voucher Number', 'Narration', 'Debit', 'Credit', 'Ledger Name']);

        foreach ($receipts as $receipt) {
            $date = Carbon::parse($receipt['payment_date'])->format('d-m-Y');
            $voucherNumber = $receipt['receipt_number'];
            $narration = 'Fees received from '.$receipt['student'].' ('.$receipt['class'].')';
            $amount = number_format((float) $receipt['amount'], 2, '.', '');
            $ledger = $this->ledgerForPaymentMethod($receipt['method'], $organization);

            fputcsv($handle, [$date, 'Receipt', $voucherNumber, $narration, $amount, '', $ledger]);
            fputcsv($handle, [$date, 'Receipt', $voucherNumber, $narration, '', $amount, $this->settings($organization)['receipts_account']]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return Response::make($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function exportXml(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        [$from, $to] = $this->resolveDateRange($request);

        $receipts = $this->receipts($organization, $from, $to);

        $filename = sprintf('tally-receipts-%s-to-%s.xml', $from->format('Y-m-d'), $to->format('Y-m-d'));

        $settings = $this->settings($organization);

        $xml = new \XMLWriter();
        $xml->openMemory();
        $xml->setIndent(true);
        $xml->startDocument('1.0', 'UTF-8');
        $xml->startElement('ENVELOPE');
        $xml->startElement('HEADER');
        $xml->startElement('TALLYREQUEST');
        $xml->text('Import Data');
        $xml->endElement();
        $xml->endElement();
        $xml->startElement('BODY');
        $xml->startElement('IMPORTDATA');
        $xml->startElement('TALLYMESSAGE');
        $xml->startElement('VOUCHER');
        $xml->writeAttribute('VCHTYPE', 'Receipt');

        foreach ($receipts as $receipt) {
            $date = Carbon::parse($receipt['payment_date'])->format('Ymd');
            $voucherNumber = $receipt['receipt_number'];
            $narration = 'Fees received from '.$receipt['student'].' ('.$receipt['class'].')';
            $amount = number_format((float) $receipt['amount'], 2, '.', '');
            $methodLedger = $this->ledgerForPaymentMethod($receipt['method'], $organization);

            $xml->startElement('DATE');
            $xml->text($date);
            $xml->endElement();
            $xml->startElement('REFERENCE');
            $xml->text($voucherNumber);
            $xml->endElement();
            $xml->startElement('VOUCHERNUMBER');
            $xml->text($voucherNumber);
            $xml->endElement();
            $xml->startElement('NARRATION');
            $xml->text($narration);
            $xml->endElement();

            // Debit: cash/bank
            $xml->startElement('ALLLEDGERENTRIES.LIST');
            $xml->startElement('LEDGERNAME');
            $xml->text($methodLedger);
            $xml->endElement();
            $xml->startElement('ISDEEMEDPOSITIVE');
            $xml->text('Yes');
            $xml->endElement();
            $xml->startElement('AMOUNT');
            $xml->text($amount);
            $xml->endElement();
            $xml->endElement();

            // Credit: fees receivable
            $xml->startElement('ALLINVENTORYENTRIES.LIST');
            $xml->endElement();

            $xml->startElement('ALLVOUCHERENTRIES.LIST');
            $xml->startElement('LEDGERNAME');
            $xml->text($settings['receipts_account']);
            $xml->endElement();
            $xml->startElement('ISDEEMEDPOSITIVE');
            $xml->text('No');
            $xml->endElement();
            $xml->startElement('AMOUNT');
            $xml->text('-'.$amount);
            $xml->endElement();
            $xml->endElement();
        }

        $xml->endElement(); // VOUCHER
        $xml->endElement(); // TALLYMESSAGE
        $xml->endElement(); // IMPORTDATA
        $xml->endElement(); // BODY
        $xml->endElement(); // ENVELOPE
        $xml->endDocument();

        return Response::make($xml->outputMemory(), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function receipts(Organization $organization, Carbon $from, Carbon $to): array
    {
        return FeePayment::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'success')
            ->whereBetween('payment_date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->with(['student:id,user_id,class_id', 'student.user:id,name', 'student.schoolClass:id,name'])
            ->orderBy('payment_date')
            ->limit(2000)
            ->get()
            ->map(fn (FeePayment $payment) => [
                'receipt_number' => $payment->receipt_number,
                'payment_date' => $payment->payment_date->format('Y-m-d'),
                'method' => $payment->payment_method,
                'student' => $payment->student?->user?->name ?? '—',
                'class' => $payment->student?->schoolClass?->name ?? '—',
                'amount' => round((float) $payment->amount, 2),
            ])
            ->all();
    }

    private function resolveDateRange(Request $request): array
    {
        $from = Carbon::parse($request->query('from') ?: now()->startOfMonth()->format('Y-m-d'))->startOfDay();
        $to = Carbon::parse($request->query('to') ?: now()->format('Y-m-d'))->endOfDay();

        if ($to->lt($from)) {
            [$from, $to] = [$to->startOfDay(), $from->endOfDay()];
        }

        return [$from, $to];
    }

    private function tallySettings(Organization $organization): array
    {
        $settings = $this->settings($organization);

        return [
            'receipts_account' => $settings['receipts_account'],
            'cash_ledger' => $settings['cash_ledger'],
            'bank_ledger' => $settings['bank_ledger'],
        ];
    }

    private function ledgerForPaymentMethod(string $method, Organization $organization): string
    {
        $settings = $this->settings($organization);

        return in_array($method, ['cash'], true)
            ? $settings['cash_ledger']
            : $settings['bank_ledger'];
    }

    private function settings(Organization $organization): array
    {
        return [
            'receipts_account' => data_get($organization->settings ?? [], 'tally_receipts_account', 'Students Fees Receivable'),
            'cash_ledger' => data_get($organization->settings ?? [], 'tally_cash_ledger', 'Cash'),
            'bank_ledger' => data_get($organization->settings ?? [], 'tally_bank_ledger', 'Bank Account'),
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}