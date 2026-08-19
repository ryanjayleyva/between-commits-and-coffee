import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import satori, { type Font } from 'satori'
import { jsx } from 'satori/jsx/jsx-runtime'
import sharp from 'sharp'
import { SITE } from '@/lib/site'

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

const FONT_SANS = 'Geist'
const FONT_MONO = 'Geist Mono'

const SITE_HOSTNAME = new URL(SITE.url!).host

const OG_COLORS = {
  bg: '#1c1917',
  domain: '#766b66',
  title: '#7e5b4d',
  description: '#4f6e86',
} as const

interface OgImageData {
  title: string
  description: string
}

function titleStyle(title: string) {
  if (title.length > 110) return { fontSize: 40, lineHeight: 1.1 }
  if (title.length > 75) return { fontSize: 52, lineHeight: 1.05 }
  if (title.length > 45) return { fontSize: 64, lineHeight: 1 }
  return { fontSize: 84, lineHeight: 0.95 }
}

function buildOgImageMarkup({ title, description }: OgImageData) {
  const { fontSize, lineHeight } = titleStyle(title)

  return jsx('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      boxSizing: 'border-box',
      padding: '64px 72px',
      backgroundColor: OG_COLORS.bg,
      fontFamily: FONT_SANS,
    },
    children: [
      jsx('span', {
        style: {
          fontFamily: FONT_MONO,
          fontSize: 16,
          fontWeight: 600,
          color: OG_COLORS.domain,
          letterSpacing: '0.04em',
        },
        children: SITE_HOSTNAME,
      }),
      jsx('div', {
        style: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          marginTop: 80,
        },
        children: [
          jsx('h1', {
            style: {
              display: 'flex',
              fontSize,
              lineHeight,
              fontWeight: 600,
              letterSpacing: '-0.05em',
              color: OG_COLORS.title,
              margin: 0,
            },
            children: title,
          }),
          jsx('p', {
            style: {
              display: 'flex',
              fontSize: 32,
              lineHeight: 1.5,
              color: OG_COLORS.description,
              margin: 0,
            },
            children: description,
          }),
        ],
      }),
    ],
  })
}

async function loadFont(packagePath: string): Promise<Buffer> {
  const fileUrl = import.meta.resolve(packagePath)
  return readFile(fileURLToPath(fileUrl))
}

async function getFonts(): Promise<Font[]> {
  const [geist400, geist600, geistMono400, geistMono600] = await Promise.all([
    loadFont('@fontsource/geist/files/geist-latin-400-normal.woff'),
    loadFont('@fontsource/geist/files/geist-latin-600-normal.woff'),
    loadFont('@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff'),
    loadFont('@fontsource/geist-mono/files/geist-mono-latin-600-normal.woff'),
  ])

  return [
    { name: FONT_SANS, data: geist400, weight: 400, style: 'normal' },
    { name: FONT_SANS, data: geist600, weight: 600, style: 'normal' },
    { name: FONT_MONO, data: geistMono400, weight: 400, style: 'normal' },
    { name: FONT_MONO, data: geistMono600, weight: 600, style: 'normal' },
  ]
}

export async function generateOgImage({
  title,
  description,
}: OgImageData): Promise<ArrayBuffer> {
  const fonts = await getFonts()
  const svg = await satori(buildOgImageMarkup({ title, description }), {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts,
  })
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return png.buffer
}
