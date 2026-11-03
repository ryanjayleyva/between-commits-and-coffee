export interface SearchEntry {
  title: string
  tags: string[]
  href: string
  date: string
}

export function matchesEntry(entry: SearchEntry, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return false
  const haystack = `${entry.title} ${entry.tags.join(' ')}`.toLowerCase()
  return terms.every(term => haystack.includes(term))
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function resultMarkup(entry: SearchEntry, index: number): string {
  const meta =
    entry.tags.length > 0
      ? `${entry.date} · ${entry.tags.join(', ')}`
      : entry.date
  return `<a class="search__result" href="${escapeHtml(entry.href)}" role="option" id="search-result-${index}" aria-selected="false">
    <span class="search__result-title">${escapeHtml(entry.title)}</span>
    <span class="search__result-meta">${escapeHtml(meta)}</span>
  </a>`
}
