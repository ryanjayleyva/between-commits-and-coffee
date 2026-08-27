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

// Mirrors Codeberg's vue-calendar-heatmap calendar construction using civil
// dates in a pinned timezone:
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

// Codeberg labels the first full week of each month (week index >= 1).
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

// Matches Codeberg's ActivityHeatmap color indexing exactly:
//   max = ceil(maxCount * 4 / 5)
//   level = count<=0 ? 1
//         : count>=max ? 5
//         : ceil(count * 3 / max) + 1
// (the Math.min(5, ...) clamp is defensive, not part of Codeberg's formula)
function calculateCodebergLevel(count: number, max: number): ContributionLevel {
  if (count <= 0) return 1
  if (count >= max) return 5
  return Math.min(5, Math.ceil((count * 3) / max) + 1) as ContributionLevel
}

export function calculateLevels(weeks: ContributionWeek[]): CalendarWeek[] {
  const counts = weeks.flatMap(week => week.days.map(day => day.count))
  const maxCount = Math.max(0, ...counts)

  if (maxCount === 0) {
    return weeks.map(week => ({
      days: week.days.map(day => ({ ...day, level: 1 as const })),
    }))
  }

  const max = Math.ceil((maxCount * 4) / 5)

  return weeks.map(week => ({
    days: week.days.map(day => ({
      ...day,
      level: calculateCodebergLevel(day.count, max),
    })),
  }))
}
