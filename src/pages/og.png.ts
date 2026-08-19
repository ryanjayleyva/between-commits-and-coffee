import type { APIRoute } from 'astro'
import { generateOgImage } from '@/lib/og'
import { SITE } from '@/lib/site'

export const GET: APIRoute = async () => {
  const png = await generateOgImage({
    title: SITE.siteName,
    description: SITE.description,
  })
  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  })
}
