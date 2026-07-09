<?php

namespace App\Mail;

use App\Models\SuperAdminSetting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StudentWelcomeCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $studentUser,
        public readonly string $temporaryPassword,
        public readonly ?string $organizationName = null,
        public readonly ?SuperAdminSetting $settings = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $envelope = new Envelope(
            subject: 'Welcome to Gurukul ERP - Your Student Login Credentials',
        );

        if ($this->settings?->reply_to_email) {
            $envelope->replyTo(
                new Address(
                    $this->settings->reply_to_email,
                    $this->settings->from_name ?: 'Gurukul ERP'
                )
            );
        }

        return $envelope;
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.student-welcome-credentials',
        );
    }

    public function build(): static
    {
        if ($this->settings?->from_email) {
            $this->from(
                $this->settings->from_email,
                $this->settings->from_name ?: 'Gurukul ERP'
            );
        }

        return $this;
    }
}
