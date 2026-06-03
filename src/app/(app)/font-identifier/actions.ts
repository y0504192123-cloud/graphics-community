'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeDHash, hammingDistance } from '@/lib/font-hash'

export async function identifyFontFromDB(
  imageBase64: string,
  imageMimeType: string,
): Promise<{ matches?: string[]; description?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: fontsData } = await admin
    .from('fonts')
    .select('id, name, preview_hash')
    .not('preview_hash', 'is', null)

  const fonts = (fontsData ?? []) as { id: string; name: string; preview_hash: string }[]
  console.log(`[font-id] fonts with hash: ${fonts.length}`)

  if (!fonts.length) {
    return { error: 'אין פונטים עם hash במאגר. לחץ "חשב hashes" בפאנל הניהול כדי לאתחל את המאגר.' }
  }

  // DEBUG: check if target font has a hash
  const targetFont = fonts.find(f => f.name === 'Fb Galbyan Light')
  if (targetFont) {
    console.log(`[font-id] DEBUG "Fb Galbyan Light" hash: ${targetFont.preview_hash}`)
  } else {
    console.log(`[font-id] DEBUG "Fb Galbyan Light" NOT FOUND in hashed fonts`)
    // show all font names containing "galbyan" case-insensitive
    const similar = fonts.filter(f => f.name.toLowerCase().includes('galbyan'))
    console.log(`[font-id] DEBUG galbyan variants in DB: ${similar.map(f => `"${f.name}"`).join(', ') || 'none'}`)
  }

  // Compute dHash of the uploaded image
  const imageBuffer = Buffer.from(imageBase64, 'base64')
  const userHash = await computeDHash(imageBuffer)
  console.log(`[font-id] user image hash: ${userHash}`)

  // Sort by Hamming distance (lower = more similar)
  const allScored = fonts
    .map(f => ({ name: f.name, dist: hammingDistance(userHash, f.preview_hash) }))
    .sort((a, b) => a.dist - b.dist)

  const scored = allScored.slice(0, 5)
  console.log(`[font-id] top-5 by hamming:`)
  scored.forEach((s, i) => console.log(`  ${i + 1}. "${s.name}" dist=${s.dist}`))

  // DEBUG: where does the target font rank?
  if (targetFont) {
    const rank = allScored.findIndex(s => s.name === 'Fb Galbyan Light')
    const dist = allScored[rank]?.dist
    console.log(`[font-id] DEBUG "Fb Galbyan Light" rank=${rank + 1}/${allScored.length} dist=${dist}`)
  }

  const matches = scored.map(s => s.name)

  // Use Claude (haiku) only for Hebrew description — not for identification
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { matches, description: `הפונטים הדומים ביותר: ${matches.slice(0, 3).join(', ')}` }
  }

  try {
    const prompt = `אתה מומחה לפונטים עבריים. משתמש העלה תמונה עם טקסט עברי, ומצאנו את הפונטים הדומים ביותר לפי ניתוח ויזואלי אוטומטי.

הפונטים שזוהו (מהכי דומה לפחות דומה): ${matches.join(', ')}

כתוב משפט אחד בעברית בלבד שמתאר את הפונט בתמונה (סגנון, משקל, אופי) ומציין איזה פונט מהרשימה הכי סביר שמדובר בו.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
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
    const description = data.content?.[0]?.text?.trim() ?? `הפונטים הדומים ביותר: ${matches.slice(0, 3).join(', ')}`
    return { matches, description }
  } catch {
    return { matches, description: `הפונטים הדומים ביותר: ${matches.slice(0, 3).join(', ')}` }
  }
}
