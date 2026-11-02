import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Post from '@/components/Post/Post.astro'

const published = new Date('2025-01-01T00:00:00Z')

interface PostOptions {
  description?: string
  updated?: Date
  tags?: string[]
}

async function renderPost(options: PostOptions = {}) {
  const container = await AstroContainer.create()
  return container.renderToString(Post, {
    props: { title: 'A post', published, ...options },
  })
}

describe('Post', () => {
  it('renders the title and the published date', async () => {
    const html = await renderPost()

    expect(html).toContain('A post')
    expect(html).toContain('Published January 1, 2025')
  })

  it('renders the description only when given', async () => {
    expect(await renderPost({ description: 'About a post' })).toContain(
      'About a post'
    )
    expect(await renderPost()).not.toContain('post__description')
  })

  it('renders the updated date when it differs from the published date', async () => {
    const html = await renderPost({ updated: new Date('2025-02-01T00:00:00Z') })

    expect(html).toContain('Updated February 1, 2025')
  })

  it('omits the updated date when it matches the published date', async () => {
    expect(await renderPost({ updated: published })).not.toContain('Updated')
  })

  it('renders each tag in a list', async () => {
    const html = await renderPost({ tags: ['neovim', 'lua'] })

    expect(html).toContain('neovim')
    expect(html).toContain('lua')
  })

  it('omits the tag list when there are no tags', async () => {
    expect(await renderPost({ tags: [] })).not.toContain('post__tags')
  })
})
