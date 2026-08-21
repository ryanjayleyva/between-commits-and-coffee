import type { APIContext } from 'astro'
import rss from '@astrojs/rss'
import { getPostPath, getPosts } from '@/lib/content'
import { SITE } from '@/lib/site'

export async function GET(context: APIContext) {
  const posts = await getPosts()

  return rss({
    title: SITE.siteName,
    description: SITE.description,
    site: context.site!.toString(),
    customData: `<image><url>${new URL('favicon.png', context.site).toString()}</url><title>${SITE.siteName}</title><link>${context.site!.toString()}</link></image>`,
    items: posts.map(post => {
      const updated = post.data.updated

      return {
        title: post.data.title,
        description: post.data.description,
        link: getPostPath(post),
        pubDate: post.data.published,
        ...(updated
          ? { customData: `<updated>${updated.toISOString()}</updated>` }
          : {}),
      }
    }),
  })
}
