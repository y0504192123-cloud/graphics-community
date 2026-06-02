'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `אתה מומחה לזיהוי פונטים. תפקידך הוא לעזור למשתמשים לזהות פונטים בתמונות.
אם השאלה אינה קשורה לפונטים - ענה בקצרה שאתה יכול לעזור רק בנושאי זיהוי פונטים.
כשמזהים פונט בתמונה, ענה בפורמט הזה:
1. שם הפונט המדויק
2. קישור להורדה (Google Fonts / Adobe Fonts / אתר רשמי) + האם חינמי או בתשלום
3. פונטים דומים חלופיים (לפחות 2-3)
ענה תמיד בעברית בלבד.`

type HistoryEntry = { role: 'user' | 'model'; text: string }

export async function identifyFont(
  userText: string,
  imageBase64?: string,
  imageMimeType?: string,
  history?: HistoryEntry[],
): Promise<{ response?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'GEMINI_API_KEY חסר בהגדרות השרת' }

  const contents: { role: string; parts: object[] }[] = []

  if (history?.length) {
    for (const h of history) {
      contents.push({ role: h.role, parts: [{ text: h.text }] })
    }
  }

  const userParts: object[] = [{ text: userText }]
  if (imageBase64 && imageMimeType) {
    userParts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } })
  }
  contents.push({ role: 'user', parts: userParts })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.2 },
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) return { error: data.error?.message ?? 'שגיאה בתקשורת עם Gemini' }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? { response: text } : { error: 'לא התקבלה תשובה מהמודל' }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Gemini' }
  }
}
