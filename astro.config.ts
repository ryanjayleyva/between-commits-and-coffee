import { defineConfig, envField, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { zenbonesCustom } from './src/lib/zenbones-custom.ts'

export default defineConfig({
  env: {
    schema: {
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      GITHUB_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
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
      display: 'optional',
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      display: 'optional',
    },
  ],

  markdown: {
    shikiConfig: {
      theme: zenbonesCustom,
      langAlias: {
        conf: 'ini',
      },
    },
  },

  site: 'https://rjleyva.com',

  server: {
    port: 3000,
    host: true,
  },

  integrations: [sitemap()],
})
