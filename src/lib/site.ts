import { site } from 'astro:config/client'
import { PUBLIC_CF_ANALYTICS_TOKEN } from 'astro:env/client'

export const SITE = {
  title: 'RJ Leyva',
  siteName: 'Between Commits and Coffee',
  author: 'RJ Leyva',
  description:
    'Things I’ve learned building software, and things I’m still figuring out.',
  url: site,
  // Bucket Codeberg heatmap timestamps into calendar days.
  // Match the timezone you use when viewing Codeberg for day-level parity.
  timeZone: 'Asia/Manila',
} as const

export interface SocialLink {
  label: string
  href: string
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Codeberg', href: 'https://codeberg.org/rjl' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ryanjayleyva' },
  { label: 'Instagram', href: 'https://www.instagram.com/slammedwigo' },
]

export function getAnalyticsToken(): string | undefined {
  return PUBLIC_CF_ANALYTICS_TOKEN
}
