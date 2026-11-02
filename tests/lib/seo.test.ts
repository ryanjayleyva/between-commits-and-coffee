import { describe, expect, it } from 'vitest'
import { buildStructuredData, safeJsonLd } from '@/lib/seo'
import { SITE, SOCIAL_LINKS } from '@/lib/site'

const published = new Date('2025-01-01T00:00:00Z')

function buildPostData(
  overrides: Partial<Parameters<typeof buildStructuredData>[0]> = {}
) {
  return buildStructuredData({
    title: 'A post',
    description: 'About a post',
    url: new URL('https://example.com/posts/a-post/'),
    published,
    ...overrides,
  })
}

function findBlogPosting(data: ReturnType<typeof buildStructuredData>) {
  return data['@graph'].find(node => node['@type'] === 'BlogPosting')
}

describe('safeJsonLd', () => {
  const unsafeData = { text: `</script><b>&'` }

  it('escapes characters that can break out of a script tag', () => {
    expect(safeJsonLd(unsafeData)).toBe(
      '{"text":"\\u003C/script\\u003E\\u003Cb\\u003E\\u0026\\u0027"}'
    )
  })

  it('produces JSON that parses back to the original data', () => {
    expect(JSON.parse(safeJsonLd(unsafeData))).toEqual(unsafeData)
  })
})

describe('buildStructuredData', () => {
  it('describes the site author with their social profiles', () => {
    const [person] = buildStructuredData({
      description: 'About the site',
      url: new URL('https://example.com/'),
    })['@graph']

    expect(person).toMatchObject({
      '@type': 'Person',
      '@id': `${SITE.url}/#person`,
      name: SITE.author,
      sameAs: SOCIAL_LINKS.map(link => link.href),
    })
  })

  it.each([
    ['published date', { published: undefined }],
    ['title', { title: undefined }],
  ])('omits the blog posting when there is no %s', (_missing, overrides) => {
    expect(findBlogPosting(buildPostData(overrides))).toBeUndefined()
  })

  it('describes a post as a blog posting by the site author', () => {
    expect(findBlogPosting(buildPostData())).toMatchObject({
      '@type': 'BlogPosting',
      '@id': 'https://example.com/posts/a-post/#article',
      headline: 'A post',
      description: 'About a post',
      datePublished: '2025-01-01T00:00:00.000Z',
      author: { '@id': `${SITE.url}/#person` },
    })
  })

  it('includes the image only when one is given', () => {
    const image = new URL('https://example.com/og/a-post.png')

    expect(findBlogPosting(buildPostData({ image }))).toMatchObject({
      image: 'https://example.com/og/a-post.png',
    })
    expect(findBlogPosting(buildPostData())).not.toHaveProperty('image')
  })

  it('includes the modified date when the post was updated later', () => {
    const updated = new Date('2025-02-01T00:00:00Z')

    expect(findBlogPosting(buildPostData({ updated }))).toMatchObject({
      dateModified: '2025-02-01T00:00:00.000Z',
    })
  })

  it.each([
    ['equal to', published],
    ['before', new Date('2024-12-01T00:00:00Z')],
  ])(
    'omits the modified date when it is %s the published date',
    (_relation, updated) => {
      expect(findBlogPosting(buildPostData({ updated }))).not.toHaveProperty(
        'dateModified'
      )
    }
  )
})
