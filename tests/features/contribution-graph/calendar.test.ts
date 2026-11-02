import { describe, expect, it } from 'vitest'
import {
  calculateLevels,
  generateRollingCalendar,
  getMonthLabels,
} from '@/features/contribution-graph/calendar'
import type { ContributionWeek } from '@/features/contribution-graph/types'

function weekStartingOn(date: string): ContributionWeek {
  return { days: [{ date, count: 0 }] }
}

function weekWithCounts(counts: number[]): ContributionWeek {
  return {
    days: counts.map((count, index) => ({
      date: `2025-01-0${index + 1}`,
      count,
    })),
  }
}

describe('generateRollingCalendar', () => {
  const endDate = new Date('2026-11-01T12:00:00Z')

  it('builds 53 weeks of 7 days from a Sunday to a Saturday', () => {
    const weeks = generateRollingCalendar(new Map(), {
      timeZone: 'UTC',
      endDate,
    })

    expect(weeks).toHaveLength(53)
    expect(weeks.every(week => week.days.length === 7)).toBe(true)
    expect(weeks[0].days[0].date).toBe('2025-11-02')
    expect(weeks[52].days[6].date).toBe('2026-11-07')
  })

  it('uses the count for a known date and zero for the rest', () => {
    const weeks = generateRollingCalendar(new Map([['2026-11-01', 5]]), {
      timeZone: 'UTC',
      endDate,
    })
    const days = weeks.flatMap(week => week.days)

    expect(days.find(day => day.date === '2026-11-01')?.count).toBe(5)
    expect(days.find(day => day.date === '2026-10-31')?.count).toBe(0)
  })

  it('ends the calendar on the week of "today" in the given time zone', () => {
    const lateSaturdayUtc = new Date('2026-11-07T20:00:00Z')

    const utcWeeks = generateRollingCalendar(new Map(), {
      timeZone: 'UTC',
      endDate: lateSaturdayUtc,
    })
    const manilaWeeks = generateRollingCalendar(new Map(), {
      timeZone: 'Asia/Manila',
      endDate: lateSaturdayUtc,
    })

    expect(utcWeeks[52].days[6].date).toBe('2026-11-07')
    expect(manilaWeeks[52].days[6].date).toBe('2026-11-14')
  })
})

describe('getMonthLabels', () => {
  it('labels the first week of a new month', () => {
    const weeks = ['2025-11-23', '2025-11-30', '2025-12-07'].map(weekStartingOn)

    expect(getMonthLabels(weeks)).toEqual([{ label: 'Dec', weekIndex: 2 }])
  })

  it('labels the first week of a new year', () => {
    const weeks = ['2025-12-21', '2025-12-28', '2026-01-04'].map(weekStartingOn)

    expect(getMonthLabels(weeks)).toEqual([{ label: 'Jan', weekIndex: 2 }])
  })

  it('does not label the first week of the calendar', () => {
    expect(getMonthLabels([weekStartingOn('2025-11-02')])).toEqual([])
  })

  it('returns no labels when every week is in the same month', () => {
    const weeks = ['2025-11-02', '2025-11-09'].map(weekStartingOn)

    expect(getMonthLabels(weeks)).toEqual([])
  })
})

describe('calculateLevels', () => {
  it('gives every day level 1 when there is no activity', () => {
    const [week] = calculateLevels([weekWithCounts([0, 0, 0])])

    expect(week.days.map(day => day.level)).toEqual([1, 1, 1])
  })

  it('scales levels against 80% of the busiest day', () => {
    // maxCount 10 -> max = ceil(10 * 4 / 5) = 8
    const [week] = calculateLevels([weekWithCounts([0, 1, 2, 5, 7, 8, 10])])

    expect(week.days.map(day => day.level)).toEqual([1, 2, 2, 3, 4, 5, 5])
  })

  it('gives the only active day the top level', () => {
    const [week] = calculateLevels([weekWithCounts([1, 0])])

    expect(week.days.map(day => day.level)).toEqual([5, 1])
  })

  it('keeps the date and count of each day', () => {
    const [week] = calculateLevels([weekWithCounts([3])])

    expect(week.days[0]).toMatchObject({ date: '2025-01-01', count: 3 })
  })
})
