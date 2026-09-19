import type { APIRoute } from 'astro'
import { formatShortDate, getPostPath, getPosts } from '@/lib/content'

export const GET: APIRoute = async () => {
  const posts = await getPosts()
  const index = posts.map(post => ({
    title: post.data.title,
    tags: post.data.tags,
    href: getPostPath(post),
    date: formatShortDate(post.data.published),
  }))
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  })
}
