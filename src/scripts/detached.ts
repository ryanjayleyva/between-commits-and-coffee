const HEX = '0123456789abcdef'

function randomHex(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += HEX[Math.floor(Math.random() * HEX.length)]
  }
  return result
}

function initShaScramble(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const shaElement = document.querySelector<HTMLElement>('[data-sha]')
  if (!shaElement) return

  const original = shaElement.textContent ?? ''
  if (original.length === 0) return

  let frameId: number | null = null
  let iteration = 0

  const scramble = (): void => {
    if (iteration >= original.length) {
      shaElement.textContent = original
      frameId = null
      return
    }

    const revealed = original.slice(0, iteration)
    const scrambled = randomHex(original.length - iteration)
    shaElement.textContent = revealed + scrambled

    iteration += 0.25
    frameId = requestAnimationFrame(scramble)
  }

  shaElement.addEventListener('mouseenter', () => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    iteration = 0
    scramble()
  })
}

function init(): void {
  initShaScramble()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
