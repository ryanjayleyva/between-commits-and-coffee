import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatShortDate,
  getPostOgImagePath,
  getPostPath,
  sortPostsByDate,
  toPostLink,
} from '@/lib/content'
import type { Post } from '@/lib/content'

function buildPost(id: string, published: string, title = 'A post'): Post {
  return { id, data: { title, published: new Date(published) } } as Post
}

describe('sortPostsByDate', () => {
  const oldest = buildPost('oldest', '2024-01-01')
  const newest = buildPost('newest', '2025-06-01')
  const middle = buildPost('middle', '2024-09-01')

  it('orders posts from newest to oldest', () => {
    expect(sortPostsByDate([oldest, newest, middle])).toEqual([
      newest,
      middle,
      oldest,
    ])
  })

  it('does not change the order of the original array', () => {
    const posts = [oldest, newest, middle]

    sortPostsByDate(posts)

    expect(posts).toEqual([oldest, newest, middle])
  })
})

describe('getPostPath', () => {
  it('builds the post URL from a nested id', () => {
    expect(getPostPath(buildPost('neovim/formatting', '2025-01-01'))).toBe(
      '/posts/neovim/formatting/'
    )
  })
})

describe('getPostOgImagePath', () => {
  it('builds the og image URL from a nested id', () => {
    expect(
      getPostOgImagePath(buildPost('neovim/formatting', '2025-01-01'))
    ).toBe('/og/neovim/formatting.png')
  })
})

describe('toPostLink', () => {
  it('maps a post to its title, path and published date', () => {
    const post = buildPost('shell/zsh', '2025-03-05', 'My zsh setup')

    expect(toPostLink(post)).toEqual({
      title: 'My zsh setup',
      href: '/posts/shell/zsh/',
      date: new Date('2025-03-05'),
    })
  })
})

describe('date formatting', () => {
  const lateEveningUtc = new Date('2025-03-05T23:30:00Z')

  it('formats the long date in UTC', () => {
    expect(formatDate(lateEveningUtc)).toBe('March 5, 2025')
  })

  it('formats the short date in UTC', () => {
    expect(formatShortDate(lateEveningUtc)).toBe('03/05')
  })
})
