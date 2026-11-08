import { addDaysISO, assertValidTimeZone, todayInTimeZone } from './dates'
import type { ContributionDay } from './types'

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

const CONTRIBUTIONS_QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`

interface GithubContributionDay {
  date: string
  contributionCount: number
}

interface GithubContributionsResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: { contributionDays: unknown[] }[]
        }
      }
    } | null
  }
  errors?: { message: string }[]
}

function isContributionDay(value: unknown): value is GithubContributionDay {
  return (
    typeof value === 'object' &&
    value !== null &&
    'date' in value &&
    'contributionCount' in value &&
    typeof value.date === 'string' &&
    typeof value.contributionCount === 'number'
  )
}

// GitHub returns calendar dates directly, so the time zone only decides what
// "today" is for the rolling year. Private contributions are included when
// the token belongs to the user and the profile setting is on.
export async function fetchGithubContributions(
  username: string,
  options: {
    token: string
    timeZone: string
    endDate?: Date
  }
): Promise<ContributionDay[]> {
  const { token, timeZone, endDate = new Date() } = options
  assertValidTimeZone(timeZone)

  const endISO = todayInTimeZone(timeZone, endDate)
  const startISO = addDaysISO(endISO, -365)

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        login: username,
        from: `${startISO}T00:00:00Z`,
        to: `${endISO}T23:59:59Z`,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`)
  }

  const body = (await response.json()) as GithubContributionsResponse

  if (body.errors?.length) {
    throw new Error(`GitHub API error: ${body.errors[0].message}`)
  }

  const weeks =
    body.data?.user?.contributionsCollection.contributionCalendar.weeks
  if (!Array.isArray(weeks)) {
    throw new Error('Unexpected response format from GitHub API')
  }

  return weeks
    .flatMap(week => week.contributionDays)
    .filter(isContributionDay)
    .map(day => ({ date: day.date, count: day.contributionCount }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
