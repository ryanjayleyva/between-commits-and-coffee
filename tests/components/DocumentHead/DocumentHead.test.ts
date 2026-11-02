import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import DocumentHead from '@/components/DocumentHead/DocumentHead.astro'
import { SITE } from '@/lib/site'

const site = 'https://example.com'
const published = new Date('2025-01-01T00:00:00Z')

interface DocumentHeadOptions {
  title?: string
  description?: string
  published?: Date
  updated?: Date
  indexable?: boolean
}

async function renderDocumentHead(options: DocumentHeadOptions = {}) {
  const container = await AstroContainer.create({ astroConfig: { site } })
  return container.renderToString(DocumentHead, {
    props: { ...options },
    request: new Request(`${site}/posts/a-post/`),
  })
}

describe('DocumentHead', () => {
  it('prefixes the page title with the site title', async () => {
    expect(await renderDocumentHead({ title: 'A post' })).toContain(
      `<title>A post | ${SITE.title}</title>`
    )
  })

  it('uses the site title and description when none are given', async () => {
    const html = await renderDocumentHead()

    expect(html).toContain(`<title>${SITE.title}</title>`)
    expect(html).toContain(`content="${SITE.description}"`)
  })

  it('links the canonical URL and the feed on an indexable page', async () => {
    const html = await renderDocumentHead()

    expect(html).toContain(
      'rel="canonical" href="https://example.com/posts/a-post/"'
    )
    expect(html).toContain('type="application/rss+xml"')
    expect(html).toContain('property="og:url"')
    expect(html).not.toContain('content="noindex"')
  })

  it('marks a page as noindex when it is not indexable', async () => {
    const html = await renderDocumentHead({ indexable: false })

    expect(html).toContain('content="noindex"')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('property="og:url"')
  })

  it('describes a page without a published date as a website', async () => {
    const html = await renderDocumentHead()

    expect(html).toContain('property="og:type" content="website"')
    expect(html).not.toContain('article:published_time')
  })

  it('describes a published page as an article', async () => {
    const html = await renderDocumentHead({ published })

    expect(html).toContain('property="og:type" content="article"')
    expect(html).toContain(
      'property="article:published_time" content="2025-01-01T00:00:00.000Z"'
    )
  })

  it('adds the modified time only when the page was updated', async () => {
    const updated = new Date('2025-02-01T00:00:00Z')

    expect(await renderDocumentHead({ published, updated })).toContain(
      'property="article:modified_time" content="2025-02-01T00:00:00.000Z"'
    )
    expect(
      await renderDocumentHead({ published, updated: published })
    ).not.toContain('article:modified_time')
  })
})
