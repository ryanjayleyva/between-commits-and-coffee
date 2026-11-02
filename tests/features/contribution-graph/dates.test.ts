import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  assertValidTimeZone,
  toISODateInTimeZone,
  weekdayFromISO,
} from '@/features/contribution-graph/dates'

describe('toISODateInTimeZone', () => {
  const instant = new Date('2025-01-01T20:00:00Z')

  it('keeps the UTC calendar day in UTC', () => {
    expect(toISODateInTimeZone(instant, 'UTC')).toBe('2025-01-01')
  })

  it('moves to the next day in a zone ahead of UTC', () => {
    expect(toISODateInTimeZone(instant, 'Asia/Manila')).toBe('2025-01-02')
  })

  it('moves to the previous day in a zone behind UTC', () => {
    const earlyMorningUtc = new Date('2025-01-01T03:00:00Z')

    expect(toISODateInTimeZone(earlyMorningUtc, 'America/Los_Angeles')).toBe(
      '2024-12-31'
    )
  })
})

describe('addDaysISO', () => {
  it('adds and subtracts days', () => {
    expect(addDaysISO('2025-06-15', 1)).toBe('2025-06-16')
    expect(addDaysISO('2025-06-15', -15)).toBe('2025-05-31')
  })

  it('crosses a year boundary in both directions', () => {
    expect(addDaysISO('2024-12-31', 1)).toBe('2025-01-01')
    expect(addDaysISO('2025-01-01', -1)).toBe('2024-12-31')
  })

  it('includes February 29 only in a leap year', () => {
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDaysISO('2023-02-28', 1)).toBe('2023-03-01')
  })

  it('moves exactly one day across a daylight saving change', () => {
    expect(addDaysISO('2025-03-09', 1)).toBe('2025-03-10')
  })

  it('throws when the date is not formatted as YYYY-MM-DD', () => {
    expect(() => addDaysISO('2025-6-15', 1)).toThrow('Invalid ISO date')
    expect(() => addDaysISO('2025-06-15T00:00:00Z', 1)).toThrow(
      'Invalid ISO date'
    )
  })
})

describe('weekdayFromISO', () => {
  it('returns 0 for Sunday through 6 for Saturday', () => {
    expect(weekdayFromISO('2026-11-01')).toBe(0)
    expect(weekdayFromISO('2026-11-07')).toBe(6)
  })
})

describe('assertValidTimeZone', () => {
  it('accepts a valid IANA time zone', () => {
    expect(() => assertValidTimeZone('Asia/Manila')).not.toThrow()
  })

  it('throws a RangeError for an unknown time zone', () => {
    expect(() => assertValidTimeZone('Mars/Olympus_Mons')).toThrow(RangeError)
  })
})
