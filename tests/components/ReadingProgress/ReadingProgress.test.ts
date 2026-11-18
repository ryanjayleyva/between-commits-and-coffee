import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import ReadingProgress from '@/components/ReadingProgress/ReadingProgress.astro'

describe('ReadingProgress', () => {
  it('renders a decorative bar hidden from assistive technology', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(ReadingProgress)

    expect(html).toContain('reading-progress__bar')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-reading-progress')
  })
})
