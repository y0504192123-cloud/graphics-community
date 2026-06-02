import nodemailer from 'nodemailer'

export async function sendApprovalEmail(to: string, name: string | null, logoUrl?: string | null) {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  console.log('[email] EMAIL_USER:', user ? '✓ set' : '✗ MISSING')
  console.log('[email] EMAIL_PASS:', pass ? '✓ set' : '✗ MISSING')
  console.log('[email] Sending approval email to:', to)

  if (!user || !pass) {
    throw new Error('EMAIL_USER or EMAIL_PASS env var is missing')
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_PORT === '465',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })

  const displayName = name ?? 'חבר יקר'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Grafi" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 16px;" />`
    : `<div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;width:52px;height:52px;line-height:52px;text-align:center;margin-bottom:16px;">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" style="vertical-align:middle;">
          <path d="M7 25 L16 7 L25 25" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 19.5 L22 19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`

  const info = await transporter.sendMail({
    from: `"Grafi" <${process.env.EMAIL_FROM ?? user}>`,
    to,
    subject: 'ברוך הבא ל-Grafi! הבקשה אושרה ✅',
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#6b21a8;padding:32px 40px;text-align:center;">
            ${logoHtml}
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Grafi</h1>
            <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px;">קהילת הגרפיקאים החרדים</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 12px;">שלום, ${displayName}!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 8px;">
              ברוך הבא ל-<strong style="color:#6b21a8;">Grafi</strong>!
            </p>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
              בקשת ההצטרפות שלך אושרה. אתה יכול להיכנס עכשיו לפלטפורמה ולהתחיל להשתמש בכל הכלים והתכנים.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${appUrl}/login"
                 style="display:inline-block;background:#6b21a8;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
                כניסה לפלטפורמה &larr;
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">קהילת הגרפיקאים החרדים &bull; מייל זה נשלח אוטומטית</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  console.log('[email] Sent successfully, messageId:', info.messageId)
}
