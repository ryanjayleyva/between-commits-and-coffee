// @ts-check
import { defineConfig, fontProviders } from 'astro/config'

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Geist',
      cssVariable: '--font-geist',
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
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
