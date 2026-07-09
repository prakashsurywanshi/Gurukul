<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyAdmissionInquiryNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $fullName,
        private readonly string $email,
        private readonly string $token,
    )
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $verificationUrl = URL::temporarySignedRoute(
            'admissions.verify',
            now()->addHours(24),
            [
                'token' => $this->token,
                'hash' => sha1($this->email),
            ]
        );

        return (new MailMessage)
            ->subject('Verify Your Admission Request')
            ->greeting('Hello '.$this->fullName.',')
            ->line('Please verify your email address to complete your online admission request.')
            ->action('Verify Email Address', $verificationUrl)
            ->line('This verification link will expire in 24 hours.');
    }
}
