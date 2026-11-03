import { escapeHtml, matchesEntry, resultMarkup } from '@/lib/search'
import type { SearchEntry } from '@/lib/search'

const SEARCH_FORM = '.search'
const SEARCH_INPUT = '.search__input'
const SEARCH_RESULTS = '.search__results'
const SEARCH_RESULT = '.search__result'

const MAX_RESULTS = 8

let cachedIndex: SearchEntry[] | null = null
let indexRequest: Promise<SearchEntry[]> | null = null

function fetchIndex(): Promise<SearchEntry[]> {
  if (cachedIndex) return Promise.resolve(cachedIndex)
  indexRequest ??= fetch('/search-index.json')
    .then(response => {
      if (!response.ok)
        throw new Error(`Search index request failed with ${response.status}`)
      return response.json() as Promise<SearchEntry[]>
    })
    .then(index => {
      cachedIndex = index
      return index
    })
    .catch(error => {
      indexRequest = null
      throw error
    })
  return indexRequest
}

function initSearch(): void {
  const form = document.querySelector<HTMLFormElement>(SEARCH_FORM)
  const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT)
  const resultsBox = document.querySelector<HTMLElement>(SEARCH_RESULTS)
  if (!form || !input || !resultsBox) return

  let activeIndex = -1
  let activeResults: HTMLElement[] = []

  const setActive = (next: number): void => {
    if (activeResults.length === 0) return
    const wrap = (value: number): number =>
      (value + activeResults.length) % activeResults.length
    const previous = activeResults[activeIndex]
    if (previous) {
      previous.classList.remove('search__result--active')
      previous.setAttribute('aria-selected', 'false')
    }
    activeIndex = wrap(next)
    const current = activeResults[activeIndex]
    if (current) {
      current.classList.add('search__result--active')
      current.setAttribute('aria-selected', 'true')
      current.scrollIntoView({ block: 'nearest' })
    }
  }

  const hideResults = (): void => {
    activeIndex = -1
    activeResults = []
    resultsBox.hidden = true
    resultsBox.innerHTML = ''
    input.setAttribute('aria-expanded', 'false')
  }

  const showResults = async (): Promise<void> => {
    const query = input.value.trim()
    if (query === '') {
      hideResults()
      return
    }

    let entries: SearchEntry[]
    try {
      entries = await fetchIndex()
    } catch (error) {
      console.error('Failed to load search index', error)
      return
    }

    const matches = entries
      .filter(entry => matchesEntry(entry, query))
      .slice(0, MAX_RESULTS)

    resultsBox.innerHTML =
      matches.length === 0
        ? `<p class="search__empty">No posts match "${escapeHtml(query)}"</p>`
        : matches.map(resultMarkup).join('')

    activeResults = Array.from(
      resultsBox.querySelectorAll<HTMLElement>(SEARCH_RESULT)
    )
    activeIndex = -1
    resultsBox.hidden = false
    input.setAttribute('aria-expanded', 'true')
  }

  form.addEventListener('submit', event => event.preventDefault())

  input.addEventListener('focus', () => void showResults())
  input.addEventListener('input', () => void showResults())

  input.addEventListener('keydown', event => {
    switch (event.key) {
      case 'Escape':
        input.value = ''
        hideResults()
        input.blur()
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!resultsBox.hidden) setActive(activeIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!resultsBox.hidden) setActive(activeIndex - 1)
        break
      case 'Enter': {
        const active = activeResults[activeIndex]
        if (active instanceof HTMLAnchorElement) {
          event.preventDefault()
          active.click()
        }
        break
      }
    }
  })

  document.addEventListener('click', event => {
    const target = event.target as Node
    if (!form.contains(target)) hideResults()
  })
}

document.addEventListener('astro:page-load', initSearch)

document.addEventListener('keydown', event => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k')
    return
  const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT)
  if (!input) return
  event.preventDefault()
  input.focus()
  input.select()
})
