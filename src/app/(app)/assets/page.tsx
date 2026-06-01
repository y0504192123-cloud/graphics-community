import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Download, Image as ImageIcon } from 'lucide-react'
import type { Asset } from '@/types'

export default async function AssetsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })

  const items = (assets ?? []) as Asset[]

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">ספריית השראה</h1>
        <p className="mt-1 text-sm text-slate-400">פונטים, תמונות, תבניות וברשים לגרפיקאים</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2d2d4e] p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1a1a2e]">
            <ImageIcon size={24} className="text-slate-500" />
          </div>
          <p className="text-slate-400">אין פריטים עדיין</p>
          <p className="mt-1 text-sm text-slate-600">ספריית ההשראה בקרוב...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((asset) => (
            <div
              key={asset.id}
              className="rounded-xl border border-[#2d2d4e] bg-[#12121f] p-4 transition hover:border-purple-700/30"
            >
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-[#1a1a2e]">
                {asset.file_url ? (
                  <img
                    src={asset.file_url}
                    alt={asset.title}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <ImageIcon size={28} className="text-slate-600" />
                )}
              </div>
              <h3 className="font-medium text-slate-200">{asset.title}</h3>
              {asset.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{asset.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                {asset.category && (
                  <span className="rounded-full bg-[#1a1a2e] px-2 py-0.5 text-xs text-slate-400">
                    {asset.category}
                  </span>
                )}
                {asset.is_free && (
                  <span className="rounded-full bg-emerald-700/20 px-2 py-0.5 text-xs text-emerald-400">
                    חינם
                  </span>
                )}
                {asset.file_url && (
                  <a
                    href={asset.file_url}
                    download
                    className="ms-auto flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    <Download size={12} />
                    הורד
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
