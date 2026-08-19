import type { APIRoute, GetStaticPaths } from 'astro'
import { getPosts, getPostSlug, type Post } from '@/lib/content'
import { generateOgImage } from '@/lib/og'

interface Props {
  post: Post
}

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPosts()
  return posts.map(post => ({
    params: { slug: getPostSlug(post) },
    props: { post },
  }))
}

export const GET: APIRoute<Props> = async ({ props }) => {
  const { post } = props
  const png = await generateOgImage({
    title: post.data.title,
    description: post.data.description,
  })
  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  })
}
