<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyAdmissionInquiryCodeNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $fullName,
        private readonly string $code,
    )
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Admission Email Verification Code')
            ->greeting('Hello '.$this->fullName.',')
            ->line('Use the verification code below to continue your online admission form.')
            ->line('Verification code: '.$this->code)
            ->line('This code will expire in 15 minutes.');
    }
}
