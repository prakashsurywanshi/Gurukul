<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VerifyNewEmailOtpNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected User $user,
        protected string $newEmail,
        protected string $otp,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('OTP to Verify Your New Email Address')
            ->greeting('Hello ' . $this->user->name . ',')
            ->line('We received a request to update the email address on your account.')
            ->line('Use the following OTP to verify your new email address: ' . $this->otp)
            ->line('This OTP is valid for 10 minutes for ' . $this->newEmail . '.')
            ->line('If you did not request this change, you can safely ignore this email.');
    }
}
