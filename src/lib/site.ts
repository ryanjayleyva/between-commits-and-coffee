import { site } from 'astro:config/client'
import { PUBLIC_CF_ANALYTICS_TOKEN } from 'astro:env/client'

export const SITE = {
  title: 'RJ Leyva',
  author: 'RJ Leyva',
  description:
    'Practical notes on full-stack development, Neovim, integrations, and automation, written between commits.',
  url: site,
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
