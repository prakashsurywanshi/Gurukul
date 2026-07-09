<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Gurukul ERP</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f4f7fb; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #0f766e 0%, #1d4ed8 100%); color: #ffffff;">
                <p style="margin: 0 0 8px; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;">
                    Student Portal
                </p>
                <h1 style="margin: 0; font-size: 28px; line-height: 1.25;">
                    Welcome, {{ $studentUser->name }}
                </h1>
                <p style="margin: 12px 0 0; font-size: 16px; line-height: 1.6; opacity: 0.95;">
                    Your student account for {{ $organizationName ?: 'Gurukul ERP' }} is ready.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7;">
                    We are happy to welcome you to the student portal. You can now sign in to access your account and school updates.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0; border: 1px solid #dbeafe; border-radius: 12px; background-color: #f8fbff;">
                    <tr>
                        <td style="padding: 24px;">
                            <h2 style="margin: 0 0 16px; font-size: 18px; color: #1d4ed8;">
                                Login Credentials
                            </h2>
                            <p style="margin: 0 0 8px; font-size: 15px;">
                                <strong>Username:</strong> {{ $studentUser->email }}
                            </p>
                            <p style="margin: 0; font-size: 15px;">
                                <strong>Password:</strong> {{ $temporaryPassword }}
                            </p>
                        </td>
                    </tr>
                </table>

                <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
                    For your security, please sign in and change this password after your first login.
                </p>
                <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7;">
                    Login page: <a href="{{ url('/login') }}" style="color: #1d4ed8;">{{ url('/login') }}</a>
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.7;">
                    Regards,<br>
                    {{ $settings?->from_name ?: 'Gurukul ERP' }}
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
