import {
  generateWorkSlots,
  getEffectiveWorkingMinutes,
  getWorkSlotGridRange,
  isWorkday,
  type DaySlotLike
} from './workingSchedule'

const makeDate = (day: number, hour = 0, minute = 0): Date => {
  return new Date(2026, 5, day, hour, minute, 0, 0)
}

const normalWorkday: DaySlotLike = {
  date: makeDate(18),
  dayIndex: 0
}

const weekend: DaySlotLike = {
  date: makeDate(20),
  dayIndex: 1
}

const mondayAfterWeekend: DaySlotLike = {
  date: makeDate(22),
  dayIndex: 2
}

export const workingScheduleFixtureChecks = [
  {
    name: 'normal workday has 15 slots',
    pass: generateWorkSlots([normalWorkday]).length === 15
  },
  {
    name: 'lunch span counts only effective work minutes',
    pass: getEffectiveWorkingMinutes(makeDate(18, 11, 30), makeDate(18, 15, 0)) === 120
  },
  {
    name: 'after-hours range has no effective work minutes',
    pass: getEffectiveWorkingMinutes(makeDate(18, 18, 30), makeDate(18, 20, 0)) === 0
  },
  {
    name: 'weekend is not a workday by default',
    pass: isWorkday(weekend.date) === false
  },
  {
    name: 'configured non-workday is excluded',
    pass: isWorkday(normalWorkday.date, { nonWorkdays: ['2026-06-18'] }) === false
  },
  {
    name: 'configured extra workday is included',
    pass: isWorkday(weekend.date, { extraWorkdays: ['2026-06-20'] }) === true
  },
  {
    name: 'work slot grid range skips lunch width',
    pass: (() => {
      const slots = generateWorkSlots([normalWorkday])
      const range = getWorkSlotGridRange(
        makeDate(18, 11, 30).toISOString(),
        makeDate(18, 15, 0).toISOString(),
        slots
      )
      return range?.start === 5 && range.end === 9
    })()
  },
  {
    name: 'expanded rest days can show weekend-only ranges',
    pass: (() => {
      const slots = generateWorkSlots([normalWorkday, weekend], {}, { includeRestDays: true })
      const range = getWorkSlotGridRange(
        makeDate(20, 10, 0).toISOString(),
        makeDate(20, 11, 0).toISOString(),
        slots
      )
      return range !== null
    })()
  },
  {
    name: 'collapsed rest days clip phases that start on a weekend',
    pass: (() => {
      const slots = generateWorkSlots([normalWorkday, weekend, mondayAfterWeekend])
      const range = getWorkSlotGridRange(
        makeDate(20, 10, 0).toISOString(),
        makeDate(22, 12, 0).toISOString(),
        slots
      )
      return range?.start === 16 && range.end === 21
    })()
  },
  {
    name: 'collapsed rest days hide weekend-only ranges',
    pass: (() => {
      const slots = generateWorkSlots([normalWorkday, weekend, mondayAfterWeekend])
      const range = getWorkSlotGridRange(
        makeDate(20, 10, 0).toISOString(),
        makeDate(20, 11, 0).toISOString(),
        slots
      )
      return range === null
    })()
  }
]
