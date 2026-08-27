// Civil-date helpers for a fixed IANA timezone.
// Codeberg buckets heatmap entries with the browser's local calendar day
// (new Date(ts * 1000).toDateString()). We pin one timezone so build
// output is deterministic and matches that viewer's Codeberg graph.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function toISODateInTimeZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date()
): string {
  return toISODateInTimeZone(now, timeZone)
}

// Treat YYYY-MM-DD as a pure civil date and shift by N days.
export function addDaysISO(isoDate: string, days: number): string {
  const { year, month, day } = parseISODate(isoDate)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

// Sunday=0 ... Saturday=6, matching JS Date#getDay for a civil date.
export function weekdayFromISO(isoDate: string): number {
  const { year, month, day } = parseISODate(isoDate)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function formatISODateLong(isoDate: string): string {
  const { year, month, day } = parseISODate(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function monthShortFromISO(isoDate: string): string {
  const { year, month, day } = parseISODate(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function compareISODate(a: string, b: string): number {
  return a.localeCompare(b)
}

function zonedParts(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = dtf.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find(part => part.type === type)?.value
    if (!value) {
      throw new Error(`Unable to resolve ${type} for time zone ${timeZone}`)
    }
    return Number(value)
  }

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
  }
}

function parseISODate(isoDate: string): {
  year: number
  month: number
  day: number
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) {
    throw new Error(`Invalid ISO date: ${isoDate}`)
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function assertValidTimeZone(timeZone: string): void {
  // Throws RangeError for invalid IANA zones.
  Intl.DateTimeFormat(undefined, { timeZone })
  void WEEKDAYS
}
