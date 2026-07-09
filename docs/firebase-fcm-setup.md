# Firebase FCM Setup

Add these values to your Laravel `.env` file:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS=storage/app/firebase/service-account.json
```

Alternative to a file path:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CREDENTIALS_JSON='{"type":"service_account","project_id":"..."}'
```

## Flutter app flow

1. Log in with `/api/auth/login`.
2. Send the device FCM token to Laravel:

```http
POST /api/auth/device-token
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "fcm-device-token",
  "platform": "android",
  "device_name": "Pixel 8"
}
```

3. When sending a communication message, keep `sendNotification` as `true` or omit it.

```http
POST /api/communication/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Exam Reminder",
  "message": "Your exam starts tomorrow at 9 AM.",
  "audienceType": "students",
  "sendNotification": true
}
```

## Notes

- Notifications are sent through Firebase Cloud Messaging HTTP v1.
- Invalid/unregistered FCM tokens are removed automatically.
- Student push notifications work through the linked `students.user_id` account.
