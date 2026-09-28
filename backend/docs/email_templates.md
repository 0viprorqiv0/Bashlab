# Email templates — Supabase Auth

Dán vào Supabase Dashboard → Authentication → Emails → Templates. Biến `{{ .ConfirmationURL }}`
là cú pháp Supabase tự thay bằng link thật, không sửa.

## Confirm signup

```html
<div style="background:#0A0D14;padding:32px 0;font-family:monospace,monospace;">
  <div style="max-width:440px;margin:0 auto;background:#141820;border:1px solid #39434F;border-radius:12px;padding:32px;">
    <p style="color:#00FF66;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">BashLab // Verify email</p>
    <h1 style="color:#E8E9F0;font-size:22px;margin:0 0 16px;">Confirm your email address</h1>
    <p style="color:#9BA3B5;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to verify <strong style="color:#E8E9F0;">{{ .Email }}</strong> and activate your BashLab account.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#00FF66;color:#0A0D14;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
      Confirm email address
    </a>
    <p style="color:#6B7280;font-size:12px;margin:24px 0 0;">
      Didn't sign up for BashLab? You can safely ignore this email.
    </p>
  </div>
</div>
```

## Reset password

```html
<div style="background:#0A0D14;padding:32px 0;font-family:monospace,monospace;">
  <div style="max-width:440px;margin:0 auto;background:#141820;border:1px solid #39434F;border-radius:12px;padding:32px;">
    <p style="color:#00E5FF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">BashLab // Reset password</p>
    <h1 style="color:#E8E9F0;font-size:22px;margin:0 0 16px;">Reset your password</h1>
    <p style="color:#9BA3B5;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Click the button below to choose a new password for <strong style="color:#E8E9F0;">{{ .Email }}</strong>.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#00E5FF;color:#0A0D14;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
      Reset password
    </a>
    <p style="color:#6B7280;font-size:12px;margin:24px 0 0;">
      Didn't request this? You can safely ignore this email — your password won't change.
    </p>
  </div>
</div>
```
