<?php

namespace App\Contracts;

interface SmsDriver
{
    /**
     * Driver display name (matches the SMS provider setting value).
     */
    public function name(): string;

    /**
     * Send a single SMS message.
     *
     * @param  array{phone: string, message: string, senderId?: string, apiKey?: string, accountSid?: string}  $config
     * @return array{success: bool, status: int, body: mixed, message: string, reference: ?string}
     */
    public function send(array $config): array;
}