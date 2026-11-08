import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GithubContributions from '@/features/contribution-graph/GithubContributions.astro'

const env: { GITHUB_TOKEN?: string } = vi.hoisted(() => ({
  GITHUB_TOKEN: 'test-token',
}))

vi.mock('astro:env/server', () => ({
  get GITHUB_TOKEN() {
    return env.GITHUB_TOKEN
  },
}))

const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function calendarDay(date: string, contributionCount: number) {
  return { date, contributionCount }
}

function calendar(...days: ReturnType<typeof calendarDay>[]) {
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: days }] },
        },
      },
    },
  }
}

async function renderContributions() {
  const container = await AstroContainer.create()
  return container.renderToString(GithubContributions, {
    props: {
      username: 'ryanjayleyva',
      timeZone: 'UTC',
      endDate: new Date('2026-11-01T12:00:00Z'),
    },
  })
}

beforeEach(() => {
  env.GITHUB_TOKEN = 'test-token'
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  fetchMock.mockReset()
})

describe('GithubContributions', () => {
  it('shows the total number of contributions', async () => {
    respondWith(
      calendar(calendarDay('2026-10-15', 3), calendarDay('2026-10-16', 2))
    )

    expect(await renderContributions()).toContain(
      '5 contributions in the last 12 months'
    )
  })

  it('uses the singular for exactly one contribution', async () => {
    respondWith(calendar(calendarDay('2026-10-15', 1)))

    expect(await renderContributions()).toContain(
      '1 contribution in the last 12 months'
    )
  })

  it('describes each day in its tooltip', async () => {
    respondWith(
      calendar(calendarDay('2026-10-15', 1), calendarDay('2026-10-16', 2))
    )

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

  it('shows an alert instead of the graph when the token is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    env.GITHUB_TOKEN = undefined

    const html = await renderContributions()

    expect(html).toContain('role="alert"')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
