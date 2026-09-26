<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('backup:database')->dailyAt('02:00')->withoutOverlapping();
Schedule::command('notifications:digest')->dailyAt('07:00')->withoutOverlapping();
Schedule::command('ai:score')->weeklyOn(0, '01:30')->withoutOverlapping();
Schedule::command('qwa:auto-alerts fee_due')->dailyAt('08:15')->withoutOverlapping();
Schedule::command('qwa:auto-alerts birthday')->dailyAt('08:15')->withoutOverlapping();
Schedule::command('qwa:auto-alerts attendance_absent')->dailyAt('08:45')->withoutOverlapping();
Schedule::command('qwa:auto-alerts inventory_low_stock')->dailyAt('08:45')->withoutOverlapping();