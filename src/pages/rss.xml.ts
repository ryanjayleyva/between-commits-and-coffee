import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { getPosts } from '@/lib/content'
import { SITE } from '@/lib/site'

export async function GET(context: APIContext) {
  const posts = await getPosts()

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url ?? '',
    items: posts.map(post => {
      const updated = post.data.updated

      return {
        title: post.data.title,
        description: post.data.description,
        link: `/posts/${post.id}/`,
        pubDate: post.data.published,
        ...(updated
          ? { customData: `<updated>${updated.toISOString()}</updated>` }
          : {}),
      }
    }),
  })
}
