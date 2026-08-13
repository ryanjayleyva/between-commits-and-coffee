// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config'

export default defineConfig({
  env: {
    schema: {
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Geist',
      cssVariable: '--font-geist',
      weights: [400, 600],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  markdown: {
    shikiConfig: {
      theme: 'gruvbox-dark-medium',
    },
  },
  // TODO: replace with https://rjleyva.com once own the domain
  site: 'https://bcc.rjleyva-045.workers.dev',
  server: {
    port: 3000,
    host: true,
  },
})
