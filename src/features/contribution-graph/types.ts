export interface ContributionDay {
  date: string
  count: number
}

export type ContributionLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface CalendarCell extends ContributionDay {
  level: ContributionLevel
}

export interface ContributionWeek {
  days: ContributionDay[]
}

export interface CalendarWeek {
  days: CalendarCell[]
}

export interface MonthLabel {
  label: string
  weekIndex: number
}
