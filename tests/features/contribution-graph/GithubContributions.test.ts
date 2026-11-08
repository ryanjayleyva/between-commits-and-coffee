import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GithubContributions from '@/features/contribution-graph/GithubContributions.astro'

const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function heatmapEntry(isoDateTime: string, contributions: number) {
  return { timestamp: Date.parse(isoDateTime) / 1000, contributions }
}

async function renderContributions() {
  const container = await AstroContainer.create()
  return container.renderToString(GithubContributions, {
    props: {
      username: 'rjl',
      timeZone: 'UTC',
      endDate: new Date('2026-11-01T12:00:00Z'),
    },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  fetchMock.mockReset()
})

describe('GithubContributions', () => {
  it('shows the total number of contributions', async () => {
    respondWith([
      heatmapEntry('2026-10-15T12:00:00Z', 3),
      heatmapEntry('2026-10-16T12:00:00Z', 2),
    ])

    expect(await renderContributions()).toContain(
      '5 contributions in the last 12 months'
    )
  })

  it('uses the singular for exactly one contribution', async () => {
    respondWith([heatmapEntry('2026-10-15T12:00:00Z', 1)])

    expect(await renderContributions()).toContain(
      '1 contribution in the last 12 months'
    )
  })

  it('describes each day in its tooltip', async () => {
    respondWith([
      heatmapEntry('2026-10-15T12:00:00Z', 1),
      heatmapEntry('2026-10-16T12:00:00Z', 2),
    ])

    const html = await renderContributions()

    expect(html).toContain(
      'data-tooltip="No contributions on October 14, 2026"'
    )
    expect(html).toContain('data-tooltip="1 contribution on October 15, 2026"')
    expect(html).toContain('data-tooltip="2 contributions on October 16, 2026"')
  })

  it('shows an alert instead of the graph when loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    respondWith({}, 500)

    const html = await renderContributions()

    expect(html).toContain('role="alert"')
    expect(html).toContain('Unable to load contribution activity')
    expect(html).not.toContain('contribution-graph__calendar')
  })
})
