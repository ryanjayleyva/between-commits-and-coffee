const COPY_LABEL = 'Copy code to clipboard'
const COPIED_LABEL = 'Copied code to clipboard'
const RESET_DELAY_MS = 2000

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const setButtonState = (
  button: HTMLButtonElement,
  state: 'copy' | 'copied'
) => {
  if (state === 'copied') {
    button.textContent = 'Copied'
    button.setAttribute('aria-label', COPIED_LABEL)
    button.classList.add('copy-button--copied')
  } else {
    button.textContent = 'Copy'
    button.setAttribute('aria-label', COPY_LABEL)
    button.classList.remove('copy-button--copied')
  }
}

const copyCode = async (button: HTMLButtonElement) => {
  const code = button.closest('pre')?.querySelector('code')
  if (!code) return

  const success = await copyToClipboard(code.innerText)
  if (!success) return

  setButtonState(button, 'copied')
  window.setTimeout(() => setButtonState(button, 'copy'), RESET_DELAY_MS)
}

const PreBlocks = () => {
  document.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach(pre => {
    if (pre.querySelector('.copy-button')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-button'
    button.textContent = 'Copy'
    button.setAttribute('aria-label', COPY_LABEL)
    button.addEventListener('click', () => void copyCode(button))
    pre.append(button)
  })
}

document.addEventListener('astro:page-load', PreBlocks)
