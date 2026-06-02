'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SYSTEM_PROMPT = `You are an expert typographer and font identifier with encyclopedic knowledge of fonts.

When given an image with text, analyze it with extreme care:
- Examine every letterform detail: serifs vs sans-serif, stroke contrast, x-height, ascenders/descenders
- Look for unique characteristics in specific letters: the 'a', 'g', 'Q', 'R', '&', 't', 'y'
- Consider the overall style: geometric, humanist, transitional, old-style, slab serif, display, script
- Note letter spacing, weight, and optical corrections

START your response with ONLY the exact font name on the first line.
Then provide:
- **הורדה/רכישה:** Use these exact URL patterns (construct the real URL):
  • Google Fonts (free): https://fonts.google.com/specimen/Font+Name  (replace spaces with +)
  • MyFonts (paid): https://www.myfonts.com/search/font-name  (lowercase, spaces → hyphens)
  • Adobe Fonts: https://fonts.adobe.com/fonts/font-name
  • FontSquirrel (free): https://www.fontsquirrel.com/fonts/font-name
  • Hebrew fonts → Masterfont: https://www.masterfont.co.il | Fontef: https://www.fontef.com
- Whether it is free or paid
- **חלופות דומות:** 2-3 similar fonts, each with a direct URL using the same patterns above

Answer ONLY about fonts. If asked about anything else, say you can only help with font identification.
Answer in Hebrew.`

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
