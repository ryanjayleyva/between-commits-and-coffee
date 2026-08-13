const copyCode = async (button: HTMLButtonElement) => {
  const code = button.closest('pre')?.querySelector('code')
  if (!code) return
  try {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(code.innerText)
  } catch {
    return
  }
  button.textContent = 'Copied'
  button.classList.add('copy-button--copied')
  window.setTimeout(() => {
    button.textContent = 'Copy'
    button.classList.remove('copy-button--copied')
  }, 2000)
}

document.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach(pre => {
  if (pre.querySelector('.copy-button')) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'copy-button'
  button.textContent = 'Copy'
  button.setAttribute('aria-label', 'Copy code to clipboard')
  button.addEventListener('click', () => void copyCode(button))
  pre.append(button)
})
