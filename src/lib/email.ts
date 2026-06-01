import nodemailer from 'nodemailer'

export async function sendApprovalEmail(to: string, name: string | null) {
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

  const info = await transporter.sendMail({
    from: `"קהילת הגרפיקאים" <${process.env.EMAIL_FROM ?? user}>`,
    to,
    subject: 'בקשתך לקהילת הגרפיקאים אושרה! ✅',
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border-radius:16px;border:1px solid rgba(124,58,237,.25);overflow:hidden;max-width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a0533,#0f0616);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
              <span style="font-size:24px;">🎨</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">קהילת הגרפיקאים</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="color:#fff;font-size:20px;margin:0 0 12px;">שלום, ${displayName}!</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
              שמחים לבשר לך שבקשתך להצטרף לקהילת הגרפיקאים <strong style="color:#a78bfa;">אושרה</strong>!<br/>
              עכשיו יש לך גישה מלאה לכל תכני הקהילה.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${appUrl}/login"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
                כניסה לקהילה &larr;
              </a>
            </div>
            <p style="color:#475569;font-size:13px;line-height:1.6;margin:0;">
              אתה מוזמן לשתף עבודות, להשתתף בדיונים ולמצוא הזדמנויות עבודה.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);text-align:center;">
            <p style="color:#334155;font-size:12px;margin:0;">קהילת הגרפיקאים &bull; מייל זה נשלח אוטומטית</p>
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
