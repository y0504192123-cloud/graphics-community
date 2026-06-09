import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendAdminNewUserEmail(opts: {
  fullName: string | null
  email: string
  city: string | null
  yearsExperience: number | null
  registeredAt: string
}) {
  const { fullName, email, city, yearsExperience, registeredAt } = opts

  const date = new Date(registeredAt)
  const dateStr = date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jerusalem' })
  const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })

  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://graphics-community.vercel.app'}/admin`

  await transporter.sendMail({
    from: `"Grafi" <${process.env.EMAIL_FROM}>`,
    to: 'y0504192123@gmail.com',
    subject: 'בקשת הצטרפות חדשה ל-Grafi',
    text: [
      'בקשת הצטרפות חדשה התקבלה:',
      '',
      `שם: ${fullName ?? '—'}`,
      `מייל: ${email}`,
      `עיר: ${city ?? '—'}`,
      `שנות ניסיון: ${yearsExperience ?? '—'}`,
      `תאריך ושעה: ${dateStr} ${timeStr}`,
      '',
      `לאישור או דחייה: ${adminUrl}`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#6b21a8,#7c3aed);padding:28px 32px">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff">📋 בקשת הצטרפות חדשה</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.75)">Grafi — קהילת הגרפיקאים החרדים</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row('👤 שם', fullName ?? '—')}
              ${row('📧 מייל', email)}
              ${row('📍 עיר', city ?? '—')}
              ${row('💼 שנות ניסיון', yearsExperience != null ? String(yearsExperience) : '—')}
              ${row('🕐 תאריך הרשמה', `${dateStr} בשעה ${timeStr}`)}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px">
            <a href="${adminUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
              פתח את פאנל הניהול
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;width:140px">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b">${value}</td>
    </tr>`
}
