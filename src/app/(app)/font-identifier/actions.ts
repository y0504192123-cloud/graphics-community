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

type HistoryEntry = { role: 'user' | 'assistant'; text: string }

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export async function identifyFont(
  userText: string,
  imageBase64?: string,
  imageMimeType?: string,
  history?: HistoryEntry[],
): Promise<{ response?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר בהגדרות השרת' }

  const messages: AnthropicMessage[] = []

  // Add text-only history
  if (history?.length) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.text })
    }
  }

  // Current user message — may include an image
  const userContent: AnthropicContentBlock[] = []
  if (imageBase64 && imageMimeType) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMimeType, data: imageBase64 },
    })
  }
  userContent.push({ type: 'text', text: userText })
  messages.push({ role: 'user', content: userContent })

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error?.message ?? 'שגיאה בתקשורת עם Claude' }
    const text = data.content?.[0]?.text
    return text ? { response: text } : { error: 'לא התקבלה תשובה מהמודל' }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}
