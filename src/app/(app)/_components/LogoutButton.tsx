'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (compact) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center justify-center rounded-xl px-3 py-2 transition-all hover:bg-red-500/[0.08] hover:text-red-400"
        style={{ color: 'var(--tx3)', border: '1px solid var(--bd)' }}
        title="יציאה"
      >
        <LogOut size={13} />
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-all duration-200 hover:bg-red-500/[0.08] hover:text-red-400"
    >
      <LogOut size={15} />
      <span>יציאה</span>
    </button>
  )
}
