import { describe, expect, it } from 'vitest'
import { zenbonesCustom } from '../../src/lib/zenbones-custom'

const MIN_CONTRAST = 4.5

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const background = zenbonesCustom.colors['editor.background']

const foregrounds = new Set<string>([
  zenbonesCustom.colors['editor.foreground'],
  ...Object.entries(zenbonesCustom.colors)
    .filter(([key]) => key.startsWith('terminal.ansi'))
    .map(([, value]) => value),
  ...zenbonesCustom.tokenColors.map(token => token.settings.foreground),
])
// ansiBlack is the background itself, so it is not a text color.
foregrounds.delete(background)

describe('zenbones-custom contrast', () => {
  it.each([...foregrounds])('%s meets WCAG AA on the background', color => {
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(
      MIN_CONTRAST
    )
  })
})
