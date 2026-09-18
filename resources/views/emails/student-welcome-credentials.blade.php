<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('Welcome to Gurukul ERP') }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f7fb;">
        <tr>
            <td align="center" style="padding: 24px 16px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%); padding: 32px 32px 16px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; line-height: 1.3;">{{ __('Welcome to Gurukul ERP') }}</h1>
                            <p style="margin: 8px 0 0; color: #e0f2fe; font-size: 14px;">{{ __('Your student portal account is ready.') }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 32px 8px;">
                            <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #1f2937;">{{ __('Welcome, :name', ['name' => $studentUser->name]) }}</p>
                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4b5563;">{{ __('We are happy to welcome you to the student portal. You can now sign in to access your classes, fees, attendance and school announcements.') }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 32px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <h2 style="margin: 0 0 12px; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; color: #334155;">{{ __('Your login credentials') }}</h2>
                                        <table role="presentation" cellspacing="0" cellpadding="0" style="width: 100%;">
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 50%;">{{ __('Username') }}</td>
                                                <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">{{ $studentUser->username }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 50%;">{{ __('One-time password (OTP)') }}</td>
                                                <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #0f172a;">{{ $temporaryPassword }}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 32px 8px;">
                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4b5563;">{{ __('For your security, please sign in and change this password after your first login.') }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 32px 24px;">
                            <a href="{{ url('/login') }}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">{{ __('Sign in to your student portal') }}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">{{ __('If you did not create this account or believe you received this email in error, please contact the school office.') }}</p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">{{ config('app.name') }} &middot; {{ url('/') }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
