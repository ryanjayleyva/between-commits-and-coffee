import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import PostLinks from '@/components/PostLinks/PostLinks.astro'
import type { PostLink } from '@/lib/content'

async function renderPostLinks(links?: PostLink[]) {
  const container = await AstroContainer.create()
  return container.renderToString(PostLinks, { props: { links } })
}

describe('PostLinks', () => {
  it('renders nothing when there are no links', async () => {
    expect(await renderPostLinks([])).not.toContain('post-links')
    expect(await renderPostLinks()).not.toContain('post-links')
  })

  it('renders the short date, title and href of each link', async () => {
    const html = await renderPostLinks([
      {
        title: 'First post',
        href: '/posts/first/',
        date: new Date('2025-03-05T00:00:00Z'),
      },
      {
        title: 'Second post',
        href: '/posts/second/',
        date: new Date('2025-04-10T00:00:00Z'),
      },
    ])

    expect(html.match(/post-links__item/g)).toHaveLength(2)
    expect(html).toContain('href="/posts/first/"')
    expect(html).toContain('First post')
    expect(html).toContain('03/05')
    expect(html).toContain('href="/posts/second/"')
    expect(html).toContain('Second post')
    expect(html).toContain('04/10')
  })
})
