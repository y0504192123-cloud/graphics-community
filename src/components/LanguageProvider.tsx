'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '@/lib/translations'
import type { Lang, T } from '@/lib/translations'

type CtxType = { lang: Lang; toggleLang: () => void; t: T }
const Ctx = createContext<CtxType>({ lang: 'he', toggleLang: () => {}, t: translations['he'] })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('he')

  useEffect(() => {
    const saved = (localStorage.getItem('gc-lang') as Lang) || 'he'
    setLang(saved)
    document.documentElement.lang = saved
    document.documentElement.dir = saved === 'he' ? 'rtl' : 'ltr'
  }, [])

  const toggleLang = () => {
    setLang((prev) => {
      const next: Lang = prev === 'he' ? 'en' : 'he'
      localStorage.setItem('gc-lang', next)
      document.documentElement.lang = next
      document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr'
      return next
    })
  }

  return <Ctx.Provider value={{ lang, toggleLang, t: translations[lang] }}>{children}</Ctx.Provider>
}

export function useLanguage() { return useContext(Ctx) }
export function useT(): T { return useContext(Ctx).t }
