import {
  addDaysISO,
  assertValidTimeZone,
  compareISODate,
  todayInTimeZone,
  toISODateInTimeZone,
} from './dates'
import type { ContributionDay } from './types'

interface CodebergHeatmapEntry {
  timestamp: number
  contributions: number
}

const CODEBERG_API_BASE = 'https://codeberg.org/api/v1'

// NOTE: Codeberg buckets by browser-local day:
// new Date(timestamp * 1000).toDateString()
// Pin a timezone here so the build output is
// deterministic and matches Codeberg for that zone.
export async function fetchCodebergContributions(
  username: string,
  options: {
    timeZone: string
    endDate?: Date
  }
): Promise<ContributionDay[]> {
  const { timeZone, endDate = new Date() } = options
  assertValidTimeZone(timeZone)

  const url = `${CODEBERG_API_BASE}/users/${encodeURIComponent(username)}/heatmap`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Codeberg API returned ${response.status}`)
  }

  const data = (await response.json()) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from Codeberg API')
  }

  // Codeberg shows a rolling year: today back 365 days.
  const endISO = todayInTimeZone(timeZone, endDate)
  const startISO = addDaysISO(endISO, -365)

  const countsByDate = new Map<string, number>()

  for (const entry of data) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('timestamp' in entry) ||
      !('contributions' in entry)
    ) {
      continue
    }

    const { timestamp, contributions } = entry as CodebergHeatmapEntry
    if (typeof timestamp !== 'number' || typeof contributions !== 'number') {
      continue
    }

    // Same local-day bucketing as Codeberg, but in the pinned zone.
    const dateString = toISODateInTimeZone(new Date(timestamp * 1000), timeZone)

    if (
      compareISODate(dateString, startISO) < 0 ||
      compareISODate(dateString, endISO) > 0
    ) {
      continue
    }

    countsByDate.set(
      dateString,
      (countsByDate.get(dateString) ?? 0) + contributions
    )
  }

  return Array.from(countsByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
