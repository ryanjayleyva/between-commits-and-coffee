import { describe, expect, it } from 'vitest'
import { escapeHtml, matchesEntry, resultMarkup } from '@/lib/search'
import type { SearchEntry } from '@/lib/search'

function buildEntry(overrides: Partial<SearchEntry> = {}): SearchEntry {
  return {
    title: 'How I configure Neovim',
    tags: ['lua', 'lsp'],
    href: '/posts/neovim/configure/',
    date: '03/05',
    ...overrides,
  }
}

describe('matchesEntry', () => {
  it('matches when every term is in the title or tags', () => {
    expect(matchesEntry(buildEntry(), 'neovim')).toBe(true)
    expect(matchesEntry(buildEntry(), 'configure lsp')).toBe(true)
  })

  it('ignores letter case and extra whitespace', () => {
    expect(matchesEntry(buildEntry(), '  NEOVIM    Lua ')).toBe(true)
  })

  it('does not match when any term is missing', () => {
    expect(matchesEntry(buildEntry(), 'neovim rust')).toBe(false)
  })

  it('does not match a blank query', () => {
    expect(matchesEntry(buildEntry(), '')).toBe(false)
    expect(matchesEntry(buildEntry(), '   ')).toBe(false)
  })
})

describe('escapeHtml', () => {
  it('escapes ampersands, angle brackets and double quotes', () => {
    expect(escapeHtml('Tom & "Jerry" <b>')).toBe(
      'Tom &amp; &quot;Jerry&quot; &lt;b&gt;'
    )
  })
})

describe('resultMarkup', () => {
  it('renders the link, title and the date with tags', () => {
    const html = resultMarkup(buildEntry(), 2)

    expect(html).toContain('href="/posts/neovim/configure/"')
    expect(html).toContain('id="search-result-2"')
    expect(html).toContain('How I configure Neovim')
    expect(html).toContain('03/05 · lua, lsp')
  })

  it('renders only the date when there are no tags', () => {
    const html = resultMarkup(buildEntry({ tags: [] }), 0)

    expect(html).toContain('>03/05<')
    expect(html).not.toContain('·')
  })

  it('escapes the title and href', () => {
    const html = resultMarkup(
      buildEntry({
        title: '<script>alert(1)</script>',
        href: '/x" onclick="y',
      }),
      0
    )

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('href="/x&quot; onclick=&quot;y"')
  })
})
