import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/login', '/signup', '/reset-password'],
      },
    ],
    sitemap: 'https://bang-social.com/sitemap.xml',
  }
}