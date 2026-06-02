'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Font } from '@/types'

export async function identifyFontFromDB(
  imageBase64: string,
  imageMimeType: string,
): Promise<{ matches?: string[]; description?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY חסר בהגדרות השרת' }

  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('name, name_hebrew, category, style, description, tags')
    .order('name', { ascending: true })

  const fonts = (fontsData ?? []) as Partial<Font>[]
  if (!fonts.length) return { error: 'מאגר הפונטים ריק. הוסף פונטים מפאנל הניהול.' }

  const fontList = fonts.map(f => {
    const parts: string[] = [f.name ?? '']
    if (f.name_hebrew) parts.push(`/ ${f.name_hebrew}`)
    if (f.category) parts.push(`[${f.category}]`)
    if (f.style) parts.push(f.style)
    if (f.tags?.length) parts.push(f.tags.join(', '))
    return parts.join(' ')
  }).join('\n')

  const prompt = `Analyze the font used in this image.

Our Hebrew font database:
${fontList}

Reply in this exact format (nothing else):
DESCRIPTION: one sentence in Hebrew describing the visual font characteristics
MATCH: exact font name from list above (or NONE)
MATCH: second closest match (or omit)
MATCH: third closest match (or omit)

Use only names that appear exactly in the list.`

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
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMimeType, data: imageBase64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error?.message ?? 'שגיאה בתקשורת עם Claude' }

    const text: string = data.content?.[0]?.text ?? ''
    const descLine = text.match(/DESCRIPTION:\s*(.+)/i)
    const description = descLine?.[1]?.trim()
    const matchLines = text.match(/MATCH:\s*(.+)/gi) ?? []
    const matches = matchLines
      .map(l => l.replace(/^MATCH:\s*/i, '').trim())
      .filter(m => m && m.toUpperCase() !== 'NONE')
      .slice(0, 3)

    return { matches, description }
  } catch {
    return { error: 'שגיאת רשת — לא ניתן להתחבר ל-Anthropic' }
  }
}
