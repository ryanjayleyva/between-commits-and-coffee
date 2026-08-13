const COPY_LABEL = 'Copy code to clipboard'
const COPIED_LABEL = 'Copied code to clipboard'
const RESET_DELAY_MS = 2000

const fallbackCopy = (text: string): boolean => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  let success = false
  try {
    // Fall back to execCommand for browsers without the Clipboard API.
    success = (
      document as unknown as { execCommand(commandId: string): boolean }
    ).execCommand('copy')
  } catch {
    success = false
  }

  document.body.removeChild(textarea)
  return success
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to execCommand fallback
    }
  }
  return fallbackCopy(text)
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
