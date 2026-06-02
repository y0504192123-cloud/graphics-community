'use client'

import { createContext, useContext } from 'react'

const Ctx = createContext<{ theme: 'light'; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ theme: 'light', toggle: () => {} }}>{children}</Ctx.Provider>
}

export function useTheme() {
  return useContext(Ctx)
}
