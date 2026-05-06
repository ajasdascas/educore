# Auth Email Setup — EduCore

## Forgot Password / Password Reset

EduCore uses [Resend](https://resend.com) to send password-reset emails.  
When `RESEND_API_KEY` is **not set**, the reset token is still saved in the database but no email is sent. The server logs `"email provider not configured"`. This is the expected behavior in development.

---

## Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (production) | API key from resend.com. Leave empty in dev to skip sending. |
| `PASSWORD_RESET_FROM_EMAIL` | No | Sender address. Falls back to `EMAIL_FROM`, then `noreply@educore.mx`. |
| `EMAIL_FROM_NAME` | No | Display name for the sender. Default: `EduCore`. |
| `PUBLIC_APP_URL` | No | Base URL used for the reset link. Default: `http://localhost:3000`. |

---

## How to obtain a Resend API key

1. Sign up at https://resend.com (free tier: 3,000 emails/month).
2. Go to **API Keys** → **Create API Key** → scope `Sending access`.
3. Copy the key (starts with `re_`) into `RESEND_API_KEY`.
4. Add and verify your sending domain under **Domains** to avoid spam filters.

---

## Flow

```
POST /api/v1/auth/forgot-password  { email }
  → generates 32-byte hex token
  → stores token in users.invitation_token with 1-hour expiry
  → if RESEND_API_KEY set: sends HTML email via api.resend.com/emails
  → always responds: "If the email exists, a reset link has been sent"

POST /api/v1/auth/reset-password  { token, new_password }
  → validates token exists AND invitation_expires_at > NOW()
  → hashes new password with bcrypt
  → clears token and expiry
  → responds: "Password updated successfully"
```

---

## Testing locally (without real email)

The token is returned in the database. Query it directly:

```sql
SELECT email, invitation_token, invitation_expires_at
FROM users
WHERE email = 'test@example.com';
```

Then call:

```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<token_from_db>","new_password":"newpassword123"}'
```

---

## Security notes

- The response is identical whether the email exists or not (anti-enumeration).
- Email send failures are logged server-side but never exposed to the client.
- Tokens expire after 1 hour and are single-use (cleared on successful reset).
- `RESEND_API_KEY` must **never** be committed to the repository. Use `.env` (gitignored) or Railway/Render environment variables.
