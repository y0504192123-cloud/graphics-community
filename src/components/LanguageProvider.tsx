'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Lang = 'he' | 'en'
const Ctx = createContext<{ lang: Lang; toggleLang: () => void }>({ lang: 'he', toggleLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('he')

  useEffect(() => {
    const saved = (localStorage.getItem('gc-lang') as Lang) || 'he'
    setLang(saved)
    document.documentElement.lang = saved
  }, [])

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === 'he' ? 'en' : 'he'
      localStorage.setItem('gc-lang', next)
      document.documentElement.lang = next
      return next
    })
  }

  return <Ctx.Provider value={{ lang, toggleLang }}>{children}</Ctx.Provider>
}

export function useLanguage() {
  return useContext(Ctx)
}
