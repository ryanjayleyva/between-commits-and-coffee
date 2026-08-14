import { SITE, SOCIAL_LINKS } from '@/lib/site'

interface SeoData {
  title?: string
  description: string
  url: URL
  published?: Date
  updated?: Date
}

export function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
}

export function buildStructuredData({
  title,
  description,
  url,
  published,
  updated,
}: SeoData) {
  const personId = `${SITE.url}/#person`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: SITE.author,
        url: SITE.url,
        sameAs: SOCIAL_LINKS.map(l => l.href),
      },
      ...(published && title
        ? [
            {
              '@type': 'BlogPosting',
              '@id': `${url}#article`,
              headline: title,
              description,
              url,
              datePublished: published.toISOString(),
              ...(updated && updated > published
                ? { dateModified: updated.toISOString() }
                : {}),
              author: { '@id': personId },
            },
          ]
        : []),
    ],
  }
}
