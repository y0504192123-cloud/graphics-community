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
  title: { default: 'Grafi — קהילת הגרפיקאים החרדים', template: '%s | Grafi' },
  description: 'Grafi היא הפלטפורמה המרכזית לגרפיקאים חרדים — קהילה, השראה, לוח עבודות וכלים מקצועיים.',
  keywords: ['גרפיקה', 'גרפיקאים חרדים', 'עיצוב גרפי', 'קהילת גרפיקאים'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Grafi' },
  openGraph: {
    title: 'Grafi — קהילת הגרפיקאים החרדים',
    description: 'Grafi היא הפלטפורמה המרכזית לגרפיקאים חרדים — קהילה, השראה, לוח עבודות וכלים מקצועיים.',
    type: 'website',
    locale: 'he_IL',
    siteName: 'Grafi',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full`} data-theme="light">
      <head>
        <meta name="theme-color" content="#6b21a8" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}` }} />
      </head>
      <body className="min-h-full antialiased" style={{ fontFamily: 'var(--font-rubik), Segoe UI, Arial, sans-serif' }}>
        <ThemeProvider><LanguageProvider>{children}</LanguageProvider></ThemeProvider>
      </body>
    </html>
  )
}
