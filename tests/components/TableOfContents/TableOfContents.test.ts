import type { MarkdownHeading } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import TableOfContents from '@/components/TableOfContents/TableOfContents.astro'

function heading(depth: number, text: string, slug: string): MarkdownHeading {
  return { depth, text, slug }
}

async function renderTableOfContents(headings: MarkdownHeading[]) {
  const container = await AstroContainer.create()
  return container.renderToString(TableOfContents, { props: { headings } })
}

describe('TableOfContents', () => {
  it('links each h2 and h3 heading to its slug', async () => {
    const html = await renderTableOfContents([
      heading(2, 'Install', 'install'),
      heading(3, 'Configure', 'configure'),
    ])

    expect(html).toContain('href="#install"')
    expect(html).toContain('Install')
    expect(html).toContain('toc__item--level-2')
    expect(html).toContain('href="#configure"')
    expect(html).toContain('Configure')
    expect(html).toContain('toc__item--level-3')
  })

  it('ignores headings outside h2 and h3', async () => {
    const html = await renderTableOfContents([
      heading(1, 'Title', 'title'),
      heading(2, 'Install', 'install'),
      heading(4, 'Details', 'details'),
    ])

    expect(html).toContain('href="#install"')
    expect(html).not.toContain('href="#title"')
    expect(html).not.toContain('href="#details"')
  })

  it('renders nothing when no heading is an h2 or h3', async () => {
    expect(await renderTableOfContents([])).not.toContain('<nav')
    expect(
      await renderTableOfContents([heading(1, 'Title', 'title')])
    ).not.toContain('<nav')
  })
})
