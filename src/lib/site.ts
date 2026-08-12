export const SITE = {
  title: 'RJ Leyva',
  author: 'RJ Leyva',
  description:
    'Practical notes on full-stack development, Neovim, integrations, and automation, written between commits.',
  // TODO: replace with https://rjleyva.com once own the domain
  url: 'https://bcc.rjleyva-045.workers.dev',
} as const

export function getAnalyticsToken(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>
  return env.PUBLIC_CF_ANALYTICS_TOKEN
}
