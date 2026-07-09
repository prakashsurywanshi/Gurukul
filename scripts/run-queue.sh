#!/usr/bin/env bash

cd /home/tejas/Practice/laravel/laravel-gurukul || exit 1

/usr/bin/php artisan queue:work database \
  --queue=default,whatsapp \
  --stop-when-empty \
  --tries=3 \
  --timeout=120 \
  >> storage/logs/queue-cron.log 2>&1
