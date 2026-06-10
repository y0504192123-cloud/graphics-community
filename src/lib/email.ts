import nodemailer from 'nodemailer'

function makeTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_PORT === '465',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  })
}

export function buildChallengeEmailHtml(opts: {
  recipientName: string | null
  threadTitle: string
  threadUrl: string
  imageUrl: string | null
  unsubscribeUrl: string
  logoUrl?: string | null
}): string {
  const { recipientName, threadTitle, threadUrl, imageUrl, unsubscribeUrl, logoUrl } = opts
  const displayName = recipientName ?? 'חבר יקר'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Grafi" style="max-height:52px;max-width:160px;object-fit:contain;display:block;margin:0 auto 14px;" />`
    : `<div style="display:inline-block;background:rgba(255,255,255,.2);border-radius:14px;width:54px;height:54px;line-height:54px;text-align:center;margin-bottom:14px;font-size:30px;">🎯</div>`

  const imageHtml = imageUrl
    ? `<div style="margin:24px 0;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.12);">
        <img src="${imageUrl}" alt="${threadTitle}" style="width:100%;max-height:300px;object-fit:cover;display:block;" />
      </div>`
    : ''

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;max-width:100%;box-shadow:0 8px 32px rgba(0,0,0,.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#92400e 0%,#b45309 35%,#d97706 65%,#f59e0b 100%);padding:36px 40px;text-align:center;">
            ${logoHtml}
            <div style="display:inline-block;background:rgba(255,255,255,.2);border-radius:100px;padding:5px 16px;margin-bottom:14px;">
              <span style="color:rgba(255,255,255,.95);font-size:11px;font-weight:700;letter-spacing:1px;">🏆 אתגר שבועי</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;text-shadow:0 2px 8px rgba(0,0,0,.2);">🎯 אתגר שבועי חדש!</h1>
            <p style="color:rgba(255,255,255,.75);margin:8px 0 0;font-size:13px;">Grafi — קהילת הגרפיקאים החרדים</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="color:#1e293b;font-size:18px;margin:0 0 14px;font-weight:700;">שלום, ${displayName}!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 4px;">
              אתגר עיצוב שבועי חדש עלה לפורום!<br/>
              בוא תצתף, תנחש ותוכיח מי הגרפיקאי הכי חד בקהילה 🔥
            </p>
            ${imageHtml}
            <div style="margin:24px 0;padding:20px 24px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;border-right:5px solid #d97706;">
              <p style="margin:0 0 5px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">האתגר הוא:</p>
              <p style="margin:0;font-size:17px;font-weight:800;color:#1e293b;">${threadTitle}</p>
            </div>
            <div style="text-align:center;margin:32px 0;">
              <a href="${threadUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#d97706,#b45309);color:#fff;text-decoration:none;padding:15px 44px;border-radius:14px;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(180,83,9,.35);">
                השתתף עכשיו &larr;
              </a>
            </div>
            <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">פגשנו אותך בקהילה — בוא נראה מה אתה שווה! 💪</p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 40px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;">Grafi — קהילת הגרפיקאים החרדים</p>
            <p style="color:#cbd5e1;font-size:11px;margin:0;">
              קיבלת מייל זה כי אתה חלק מהקהילה.&nbsp;
              <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">הסר אותי מרשימת התפוצה</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendChallengeEmail(opts: {
  to: string
  recipientName: string | null
  threadTitle: string
  threadUrl: string
  imageUrl: string | null
  unsubscribeUrl: string
  logoUrl?: string | null
}): Promise<void> {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  if (!user || !pass) throw new Error('EMAIL credentials missing')
  await makeTransporter().sendMail({
    from: `"Grafi" <${process.env.EMAIL_FROM ?? user}>`,
    to: opts.to,
    subject: `🎯 אתגר שבועי חדש! ${opts.threadTitle}`,
    html: buildChallengeEmailHtml(opts),
  })
}

export function buildApprovalEmailHtml(opts: {
  name: string | null
  logoUrl?: string | null
}): string {
  const displayName = opts.name ?? 'חבר יקר'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const logoHtml = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="Grafi" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 16px;" />`
    : `<div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;width:52px;height:52px;line-height:52px;text-align:center;margin-bottom:16px;">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" style="vertical-align:middle;">
          <path d="M7 25 L16 7 L25 25" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 19.5 L22 19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`

  return `<!DOCTYPE html>
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
</html>`
}

export async function sendApprovalEmail(to: string, name: string | null, logoUrl?: string | null) {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  console.log('[email] EMAIL_USER:', user ? '✓ set' : '✗ MISSING')
  console.log('[email] EMAIL_PASS:', pass ? '✓ set' : '✗ MISSING')
  console.log('[email] Sending approval email to:', to)

  if (!user || !pass) throw new Error('EMAIL_USER or EMAIL_PASS env var is missing')

  const info = await makeTransporter().sendMail({
    from: `"Grafi" <${process.env.EMAIL_FROM ?? user}>`,
    to,
    subject: 'ברוך הבא ל-Grafi! הבקשה אושרה ✅',
    html: buildApprovalEmailHtml({ name, logoUrl }),
  })

  console.log('[email] Sent successfully, messageId:', info.messageId)
}

export async function sendForumReplyEmail(
  to: string,
  recipientName: string | null,
  replierName: string | null,
  threadTitle: string,
  threadUrl: string,
  logoUrl?: string | null,
) {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  if (!user || !pass) return

  const transporter = makeTransporter()

  const displayName = recipientName ?? 'חבר יקר'
  const replier = replierName ?? 'מישהו'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Grafi" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 16px;" />`
    : `<div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;width:52px;height:52px;line-height:52px;text-align:center;margin-bottom:16px;">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" style="vertical-align:middle;">
          <path d="M7 25 L16 7 L25 25" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 19.5 L22 19.5" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>`

  await transporter.sendMail({
    from: `"Grafi" <${process.env.EMAIL_FROM ?? user}>`,
    to,
    subject: `תגובה חדשה בנושא: ${threadTitle}`,
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
              <strong style="color:#6b21a8;">${replier}</strong> ענה לנושא שאתה עוקב אחריו:
            </p>
            <div style="margin:20px 0;padding:16px 20px;background:#f8f7ff;border-radius:12px;border-right:4px solid #7c3aed;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${threadTitle}</p>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${threadUrl}"
                 style="display:inline-block;background:#6b21a8;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
                עבור לדיון &larr;
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
  }).catch((err: unknown) => console.error('[forum reply email] failed:', err))
}
