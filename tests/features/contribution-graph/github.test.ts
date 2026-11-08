import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGithubContributions } from '@/features/contribution-graph/github'

const endDate = new Date('2026-11-01T12:00:00Z')
const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function calendar(...weeks: { date: string; contributionCount: number }[][]) {
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: weeks.map(contributionDays => ({ contributionDays })),
          },
        },
      },
    },
  }
}

function fetchContributions(timeZone = 'UTC') {
  return fetchGithubContributions('ryanjayleyva', {
    token: 'test-token',
    timeZone,
    endDate,
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('fetchGithubContributions', () => {
  it('posts the query to the GraphQL API with the token', async () => {
    respondWith(calendar())

    await fetchContributions()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/graphql')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ Authorization: 'bearer test-token' })
  })

  it('asks for the rolling year ending today in the given time zone', async () => {
    respondWith(calendar())

    // 20:00 UTC on Nov 1 is already Nov 2 in Manila.
    await fetchGithubContributions('ryanjayleyva', {
      token: 'test-token',
      timeZone: 'Asia/Manila',
      endDate: new Date('2026-11-01T20:00:00Z'),
    })

    const init = fetchMock.mock.calls[0][1]
    const { variables } = JSON.parse(init?.body as string) as {
      variables: unknown
    }
    expect(variables).toEqual({
      login: 'ryanjayleyva',
      from: '2025-11-02T00:00:00Z',
      to: '2026-11-02T23:59:59Z',
    })
  })

  it('throws when the API responds with an error status', async () => {
    respondWith({}, 401)

    await expect(fetchContributions()).rejects.toThrow(
      'GitHub API returned 401'
    )
  })

  it('throws when GraphQL reports errors', async () => {
    respondWith({ errors: [{ message: 'Bad credentials' }] })

    await expect(fetchContributions()).rejects.toThrow(
      'GitHub API error: Bad credentials'
    )
  })

  it('throws when the user does not exist', async () => {
    respondWith({ data: { user: null } })

    await expect(fetchContributions()).rejects.toThrow(
      'Unexpected response format from GitHub API'
    )
  })

  it('throws before fetching when the time zone is invalid', async () => {
    await expect(fetchContributions('Mars/Olympus_Mons')).rejects.toThrow(
      RangeError
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('flattens the weeks into days sorted by date', async () => {
    respondWith(
      calendar(
        [
          { date: '2026-10-16', contributionCount: 2 },
          { date: '2026-10-14', contributionCount: 5 },
        ],
        [{ date: '2026-10-15', contributionCount: 0 }]
      )
    )

    expect(await fetchContributions()).toEqual([
      { date: '2026-10-14', count: 5 },
      { date: '2026-10-15', count: 0 },
      { date: '2026-10-16', count: 2 },
    ])
  })

  it('skips malformed days', async () => {
    respondWith(
      calendar([
        null,
        { date: '2026-10-14' },
        { contributionCount: 1 },
        { date: '2026-10-15', contributionCount: 4 },
      ] as never)
    )

    expect(await fetchContributions()).toEqual([
      { date: '2026-10-15', count: 4 },
    ])
  })
})
