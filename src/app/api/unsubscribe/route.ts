import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

function htmlPage(title: string, emoji: string, message: string, isError = false) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;direction:rtl;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:20px;padding:52px 60px;max-width:460px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.08);">
    <div style="font-size:52px;margin-bottom:20px;">${emoji}</div>
    <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 14px;">${title}</h1>
    <p style="color:${isError ? '#ef4444' : '#64748b'};font-size:15px;line-height:1.6;margin:0 0 32px;">${message}</p>
    <a href="${appUrl}/dashboard"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:13px 34px;border-radius:12px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(124,58,237,.3);">
      חזור לאתר
    </a>
    <p style="color:#cbd5e1;font-size:12px;margin:24px 0 0;">Grafi — קהילת הגרפיקאים החרדים</p>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid')

  if (!uid || uid === 'test' || uid === 'PREVIEW') {
    return new NextResponse(
      htmlPage('מייל ניסיון', '🧪', 'זהו מייל ניסיון — לא בוצעה פעולה אמיתית.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ unsubscribed_emails: true })
    .eq('id', uid)

  if (error) {
    return new NextResponse(
      htmlPage('שגיאה', '❌', 'אירעה שגיאה בעיבוד הבקשה. נסה שוב מאוחר יותר.', true),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  return new NextResponse(
    htmlPage('הוסרת בהצלחה', '✅', 'הוסרת מרשימת התפוצה ולא תקבל יותר מיילים על אתגרים שבועיים.'),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
