'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SYSTEM_PROMPT = `You are a font identification expert. Analyze the image carefully.

Start your response with EXACTLY one of these three lines (nothing else on that line):
CONFIDENCE: HIGH
CONFIDENCE: MEDIUM
CONFIDENCE: LOW

Then answer in Hebrew with:
- Description of visual characteristics: serif/sans-serif, weight, style, unique details
- Your best guess for the font name, and clearly state if confidence is low
- Links — ONLY use search URLs (never make up direct /specimen/ or /fonts/ paths unless 100% certain they exist):
  * Google Fonts search: https://fonts.google.com/?query=fontname
  * MyFonts search: https://www.myfonts.com/search/?query=fontname
  * Hebrew fonts: https://www.masterfont.co.il/search?q=fontname
- 2-3 similar alternative fonts with their search URLs

Answer ONLY about fonts. If asked about anything else, say you can only help with font identification.`

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
): Promise<{ response?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר בהגדרות השרת' }

  const admin = createAdminClient()

  // Load full conversation history from DB
  const { data: dbHistory } = await admin
    .from('font_conversations')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(40)

  // Upload image to storage (non-blocking on failure)
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
    } catch { /* storage failure does not block the API call */ }
  }

  // Build messages: history (text-only) + current user message (may include image)
  const messages: AnthropicMessage[] = (dbHistory ?? []).map(h => ({
    role: h.role as 'user' | 'assistant',
    content: h.content as string,
  }))

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

    // Persist turn to DB
    await admin.from('font_conversations').insert([
      { user_id: user.id, role: 'user',      content: userText, image_url: imageUrl },
      { user_id: user.id, role: 'assistant', content: text,     image_url: null },
    ])

    return { response: text }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}
