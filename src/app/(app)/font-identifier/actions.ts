'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const admin = createAdminClient()

  // Upload image to storage if provided, save public URL for history
  let imageUrl: string | null = null
  if (imageBase64 && imageMimeType) {
    try {
      const ext = imageMimeType.split('/')[1]?.split('+')[0] ?? 'jpg'
      const path = `font-images/${user.id}/${Date.now()}.${ext}`
      const buffer = Buffer.from(imageBase64, 'base64')
      const { error: uploadErr } = await admin.storage
        .from('chat-attachments')
        .upload(path, buffer, { contentType: imageMimeType })
      if (!uploadErr) {
        const { data: { publicUrl } } = admin.storage
          .from('chat-attachments')
          .getPublicUrl(path)
        imageUrl = publicUrl
      }
    } catch {
      // Storage upload failing should not block the API call
    }
  }

  // Build Anthropic messages array
  const messages: AnthropicMessage[] = []

  if (history?.length) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.text })
    }
  }

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
    const text: string | undefined = data.content?.[0]?.text
    if (!text) return { error: 'לא התקבלה תשובה מהמודל' }

    // Save conversation to DB (fire-and-forget, don't block response)
    admin.from('font_conversations').insert([
      { user_id: user.id, role: 'user',      content: userText, image_url: imageUrl },
      { user_id: user.id, role: 'assistant', content: text,     image_url: null },
    ])

    return { response: text }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}
