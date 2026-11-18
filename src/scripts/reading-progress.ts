let progress: HTMLElement | null = null

function updateProgress(): void {
  if (!progress) return
  const scrollableHeight =
    document.documentElement.scrollHeight - window.innerHeight
  const ratio = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0
  progress.style.setProperty('--reading-progress', String(Math.min(1, ratio)))
}

// The module persists across client-side navigations. Look the bar up
// again on every page load so pages without one stop updating.
function init(): void {
  progress = document.querySelector<HTMLElement>('[data-reading-progress]')
  updateProgress()
}

window.addEventListener('scroll', updateProgress, { passive: true })
window.addEventListener('resize', updateProgress)
document.addEventListener('astro:page-load', init)

export {}
