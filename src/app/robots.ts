import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grafi.co.il'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/terms', '/privacy'],
        disallow: [
          '/dashboard', '/chat', '/forum', '/admin', '/settings',
          '/profile', '/jobs', '/inspiration',
          '/assets', '/font-identifier', '/news',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
