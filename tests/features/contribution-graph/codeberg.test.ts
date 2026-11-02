import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCodebergContributions } from '@/features/contribution-graph/codeberg'

const endDate = new Date('2026-11-01T12:00:00Z')
const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function heatmapEntry(isoDateTime: string, contributions: number) {
  return { timestamp: Date.parse(isoDateTime) / 1000, contributions }
}

function fetchContributions(timeZone = 'UTC') {
  return fetchCodebergContributions('rjl', { timeZone, endDate })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('fetchCodebergContributions', () => {
  it('requests the heatmap of the encoded username', async () => {
    respondWith([])

    await fetchCodebergContributions('a b', { timeZone: 'UTC', endDate })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://codeberg.org/api/v1/users/a%20b/heatmap'
    )
  })

  it('throws when the API responds with an error status', async () => {
    respondWith({}, 500)

    await expect(fetchContributions()).rejects.toThrow(
      'Codeberg API returned 500'
    )
  })

  it('throws when the response is not an array', async () => {
    respondWith({ contributions: 1 })

    await expect(fetchContributions()).rejects.toThrow(
      'Unexpected response format from Codeberg API'
    )
  })

  it('throws before fetching when the time zone is invalid', async () => {
    await expect(fetchContributions('Mars/Olympus_Mons')).rejects.toThrow(
      RangeError
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sums contributions per day and sorts by date', async () => {
    respondWith([
      heatmapEntry('2026-10-15T09:00:00Z', 2),
      heatmapEntry('2026-10-14T09:00:00Z', 5),
      heatmapEntry('2026-10-15T18:00:00Z', 1),
    ])

    expect(await fetchContributions()).toEqual([
      { date: '2026-10-14', count: 5 },
      { date: '2026-10-15', count: 3 },
    ])
  })

  it('skips malformed entries', async () => {
    respondWith([
      null,
      'not an entry',
      { contributions: 1 },
      { timestamp: 'yesterday', contributions: 1 },
      heatmapEntry('2026-10-15T12:00:00Z', 4),
    ])

    expect(await fetchContributions()).toEqual([
      { date: '2026-10-15', count: 4 },
    ])
  })

  it('keeps only the rolling year ending today', async () => {
    respondWith([
      heatmapEntry('2025-10-31T12:00:00Z', 1),
      heatmapEntry('2025-11-01T12:00:00Z', 2),
      heatmapEntry('2026-11-01T12:00:00Z', 3),
      heatmapEntry('2026-11-02T12:00:00Z', 4),
    ])

    expect(await fetchContributions()).toEqual([
      { date: '2025-11-01', count: 2 },
      { date: '2026-11-01', count: 3 },
    ])
  })

  it.each([
    ['UTC', '2026-10-15'],
    ['Asia/Manila', '2026-10-16'],
  ])('buckets a 20:00 UTC entry into the %s day', async (timeZone, date) => {
    respondWith([heatmapEntry('2026-10-15T20:00:00Z', 1)])

    expect(await fetchContributions(timeZone)).toEqual([{ date, count: 1 }])
  })
})
