import { getCollection } from 'astro:content'
import type { CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>

export interface PostLink {
  title: string
  href: string
  date: Date
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
    date: post.data.published,
  }
}

export function toPostLinks(posts: Post[]): PostLink[] {
  return posts.map(toPostLink)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
