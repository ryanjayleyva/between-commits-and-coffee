export const SITE = {
  title: 'RJ Leyva',
  author: 'RJ Leyva',
  description:
    'Practical notes on full-stack development, Neovim, integrations, and automation, written between commits.',
  // TODO: replace with https://rjleyva.com once own the domain
  url: 'https://bcc.rjleyva-045.workers.dev',
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
  const env = import.meta.env as Record<string, string | undefined>
  return env.PUBLIC_CF_ANALYTICS_TOKEN
}
