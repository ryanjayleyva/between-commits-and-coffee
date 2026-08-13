import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>

export interface PostLink {
  title: string
  href: string
}

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts')
  return sortPostsByDate(posts)
}

export function sortPostsByDate(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf()
  )
}

export function toPostLink(post: Post): PostLink {
  return {
    title: post.data.title,
    href: `/posts/${post.id}/`,
  }
}

export function toPostLinks(posts: Post[]): PostLink[] {
  return posts.map(toPostLink)
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
