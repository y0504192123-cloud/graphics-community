import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import './globals.css'

const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'גרפיקס קהילה',
  description: 'פלטפורמת הקהילה לגרפיקאים',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full`} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flicker: set theme before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('gc-theme')||'dark';document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('gc-lang')||'he';document.documentElement.lang=l;})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-rubik), Segoe UI, Arial, sans-serif' }}>
        <ThemeProvider><LanguageProvider>{children}</LanguageProvider></ThemeProvider>
      </body>
    </html>
  )
}
