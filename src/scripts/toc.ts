// The reading line. A heading stays current until the next heading
// crosses this offset below the top of the viewport.
const ACTIVE_OFFSET_PX = 96

interface TocItem {
  heading: HTMLElement
  link: HTMLAnchorElement
}

let items: TocItem[] = []
let activeLink: HTMLAnchorElement | null = null

function collect(): boolean {
  const nav = document.querySelector('[data-toc]')
  if (!nav) return false

  items = []
  nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href')?.slice(1)
    if (!id) return
    const heading = document.getElementById(id)
    if (heading) items.push({ heading, link })
  })
  return items.length > 0
}

function setActive(link: HTMLAnchorElement | null): void {
  if (activeLink === link) return
  activeLink?.classList.remove('toc__link--active')
  activeLink?.removeAttribute('aria-current')
  link?.classList.add('toc__link--active')
  link?.setAttribute('aria-current', 'true')
  activeLink = link
}

function updateActive(): void {
  let current: HTMLAnchorElement | null = null
  for (const item of items) {
    if (item.heading.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) {
      current = item.link
    } else {
      break
    }
  }
  setActive(current)
}

// The module persists across client-side navigations. Rebuild the
// item list from the live DOM on every page load and reset the
// active link so no state leaks between posts.
function init(): void {
  items = []
  activeLink = null
  if (!collect()) return
  window.addEventListener('scroll', updateActive, { passive: true })
  window.addEventListener('resize', updateActive)
  updateActive()
}

document.addEventListener('astro:page-load', init)

export {}
