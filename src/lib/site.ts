import { site } from 'astro:config/client'
import { PUBLIC_CF_ANALYTICS_TOKEN } from 'astro:env/client'

export const SITE = {
  title: 'RJ Leyva',
  siteName: 'Between Commits and Coffee',
  author: 'RJ Leyva',
  description:
    'Things I’ve learned building software, and things I’m still figuring out.',
  url: site,
  // Decides what "today" is for the contribution graph's rolling year.
  // Match the timezone set on your GitHub profile for day-level parity.
  timeZone: 'Asia/Manila',
} as const

export interface SocialLink {
  label: string
  href: string
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/ryanjayleyva' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ryanjayleyva' },
  { label: 'Instagram', href: 'https://www.instagram.com/slammedwigo' },
]

export function getAnalyticsToken(): string | undefined {
  return PUBLIC_CF_ANALYTICS_TOKEN
}
