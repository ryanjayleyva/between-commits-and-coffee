import {
  addDaysISO,
  monthShortFromISO,
  todayInTimeZone,
  weekdayFromISO,
} from './dates'
import type {
  CalendarWeek,
  ContributionDay,
  ContributionLevel,
  ContributionWeek,
  MonthLabel,
} from './types'

const DAYS_IN_WEEK = 7
const DAYS_IN_ONE_YEAR = 365
const MAX_WEEKS = 53

// Builds a rolling-year calendar using civil dates in a pinned timezone:
//   endDate = today
//   startDate = endDate - 365
//   pad to the Sunday on/before start through the Saturday on/after end
export function generateRollingCalendar(
  countsByDate: Map<string, number>,
  options: {
    timeZone: string
    endDate?: Date
  }
): ContributionWeek[] {
  const { timeZone, endDate = new Date() } = options

  const endISO = todayInTimeZone(timeZone, endDate)
  const startISO = addDaysISO(endISO, -DAYS_IN_ONE_YEAR)

  const calendarStartISO = addDaysISO(startISO, -weekdayFromISO(startISO))
  const daysToAdd = DAYS_IN_WEEK - 1 - weekdayFromISO(endISO)
  const calendarEndISO = addDaysISO(endISO, daysToAdd)

  const weeks: ContributionWeek[] = []
  let currentWeek: ContributionDay[] = []
  let currentISO = calendarStartISO

  while (currentISO <= calendarEndISO) {
    currentWeek.push({
      date: currentISO,
      count: countsByDate.get(currentISO) ?? 0,
    })

    if (currentWeek.length === DAYS_IN_WEEK) {
      weeks.push({ days: currentWeek })
      currentWeek = []
    }

    currentISO = addDaysISO(currentISO, 1)
  }

  return weeks.slice(-MAX_WEEKS)
}

// Labels the first full week of each month (week index >= 1).
export function getMonthLabels(weeks: ContributionWeek[]): MonthLabel[] {
  const labels: MonthLabel[] = []

  for (let index = 1; index < weeks.length; index++) {
    const previousWeekStart = weeks[index - 1].days[0].date
    const currentWeekStart = weeks[index].days[0].date

    const previousMonth = Number(previousWeekStart.slice(5, 7))
    const currentMonth = Number(currentWeekStart.slice(5, 7))
    const previousYear = Number(previousWeekStart.slice(0, 4))
    const currentYear = Number(currentWeekStart.slice(0, 4))

    if (
      previousYear < currentYear ||
      (previousYear === currentYear && previousMonth < currentMonth)
    ) {
      labels.push({
        label: monthShortFromISO(currentWeekStart),
        weekIndex: index,
      })
    }
  }

  return labels
}

// Matches GitHub's contribution levels: 0 for no activity, then quartiles of
// the busiest day (1 = lightest, 4 = darkest).
function calculateLevel(count: number, maxCount: number): ContributionLevel {
  if (count <= 0) return 0
  return Math.min(4, Math.ceil((count * 4) / maxCount)) as ContributionLevel
}

export function calculateLevels(weeks: ContributionWeek[]): CalendarWeek[] {
  const counts = weeks.flatMap(week => week.days.map(day => day.count))
  const maxCount = Math.max(0, ...counts)

  return weeks.map(week => ({
    days: week.days.map(day => ({
      ...day,
      level: calculateLevel(day.count, maxCount),
    })),
  }))
}
