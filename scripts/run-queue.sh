#!/usr/bin/env bash

cd "$(dirname "$0")/.." || exit 1

/usr/bin/php artisan queue:worker:run \
  >> storage/logs/queue-cron.log 2>&1
