export interface WorkSession {
  start: string
  end: string
}

export interface WorkdayConfig {
  nonWorkdays?: string[]
  extraWorkdays?: string[]
}

export interface DaySlotLike {
  date: Date
  dayIndex: number
}

export interface WorkSlot {
  date: Date
  dateKey: string
  dayIndex: number
  workdayIndex: number
  slotInDay: number
  index: number
  start: Date
  end: Date
  timeLabel: string
  dateLabel: string
}

export interface GridColumnRange {
  start: number
  end: number
}

export interface GenerateWorkSlotsOptions {
  includeRestDays?: boolean
}

export const WORK_SESSIONS: WorkSession[] = [
  { start: '09:30', end: '12:30' },
  { start: '14:00', end: '18:30' }
]

export const WORK_SLOT_MINUTES = 30

const MINUTE_MS = 60 * 1000

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseTimeToMinutes = (value: string): number => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

const workSessionMinutes = WORK_SESSIONS.map(session => ({
  start: parseTimeToMinutes(session.start),
  end: parseTimeToMinutes(session.end)
}))

export const WORK_SLOTS_PER_DAY = workSessionMinutes.reduce(
  (sum, session) => sum + (session.end - session.start) / WORK_SLOT_MINUTES,
  0
)

export const formatTimeLabel = (date: Date): string => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const formatDateLabel = (date: Date): string => {
  const weekdays = '日一二三四五六'
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`
}

export const setTimeOnDate = (date: Date, minutes: number): Date => {
  const next = new Date(date)
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return next
}

export const getMinutesOfDay = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes()
}

export const isWorkday = (date: Date, config: WorkdayConfig = {}): boolean => {
  const key = formatDateKey(date)
  if (config.nonWorkdays?.includes(key)) return false
  if (config.extraWorkdays?.includes(key)) return true
  const day = date.getDay()
  return day >= 1 && day <= 5
}

export const isSlotBoundary = (date: Date): boolean => {
  return date.getSeconds() === 0 &&
    date.getMilliseconds() === 0 &&
    getMinutesOfDay(date) % WORK_SLOT_MINUTES === 0
}

export const isDateOnlyMidnight = (date: Date): boolean => {
  return date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
}

export const normalizePhaseDateTime = (
  value: string | null | undefined,
  boundary: 'start' | 'end'
): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (!isDateOnlyMidnight(date)) return date
  return setTimeOnDate(date, boundary === 'start' ? workSessionMinutes[0].start : workSessionMinutes[workSessionMinutes.length - 1].end)
}

export const toLocalDateTimeInputValue = (
  value: string | null | undefined,
  boundary: 'start' | 'end'
): string => {
  const date = normalizePhaseDateTime(value, boundary)
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

export const localDateTimeInputToIso = (value: string): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const isValidWorkStart = (date: Date, config: WorkdayConfig = {}): boolean => {
  if (!isSlotBoundary(date)) return false
  const minute = getMinutesOfDay(date)
  return workSessionMinutes.some(session => minute >= session.start && minute < session.end)
}

export const isValidWorkEnd = (date: Date, config: WorkdayConfig = {}): boolean => {
  if (!isSlotBoundary(date)) return false
  const minute = getMinutesOfDay(date)
  return workSessionMinutes.some(session => minute > session.start && minute <= session.end)
}

export const validatePhaseTimeRange = (
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  config: WorkdayConfig = {}
): string | null => {
  if (!startValue && !endValue) return null
  if (!startValue || !endValue) return '阶段开始和结束时间需要同时填写'

  const start = normalizePhaseDateTime(startValue, 'start')
  const end = normalizePhaseDateTime(endValue, 'end')
  if (!start || !end) return '阶段时间格式无效'
  if (!isValidWorkStart(start, config)) return '阶段开始时间必须落在工作时间内，并以 30 分钟为单位'
  if (!isValidWorkEnd(end, config)) return '阶段结束时间必须落在工作时间内，并以 30 分钟为单位'
  if (end.getTime() <= start.getTime()) return '阶段结束时间必须晚于开始时间'
  if (getEffectiveWorkingMinutes(start, end, config) <= 0) return '阶段时间范围内没有有效工作时间'

  return null
}

export const generateWorkSlots = (
  days: DaySlotLike[],
  config: WorkdayConfig = {},
  options: GenerateWorkSlotsOptions = {}
): WorkSlot[] => {
  const slots: WorkSlot[] = []
  let workdayIndex = 0

  for (const day of days) {
    const workday = isWorkday(day.date, config)
    if (!workday && !options.includeRestDays) continue
    let slotInDay = 0

    for (const session of workSessionMinutes) {
      for (let minutes = session.start; minutes < session.end; minutes += WORK_SLOT_MINUTES) {
        const start = setTimeOnDate(day.date, minutes)
        const end = setTimeOnDate(day.date, minutes + WORK_SLOT_MINUTES)
        slots.push({
          date: new Date(day.date),
          dateKey: formatDateKey(day.date),
          dayIndex: day.dayIndex,
          workdayIndex,
          slotInDay,
          index: slots.length,
          start,
          end,
          timeLabel: formatTimeLabel(start),
          dateLabel: formatDateLabel(day.date)
        })
        slotInDay++
      }
    }

    workdayIndex++
  }

  return slots
}

const findFirstOverlappingSlotIndex = (start: Date, end: Date, slots: WorkSlot[]): number | null => {
  const startTime = start.getTime()
  const endTime = end.getTime()
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (slot.end.getTime() > startTime && slot.start.getTime() < endTime) return i
  }
  return null
}

const findLastOverlappingSlotEndIndex = (start: Date, end: Date, slots: WorkSlot[]): number | null => {
  const startTime = start.getTime()
  const endTime = end.getTime()
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i]
    if (slot.end.getTime() > startTime && slot.start.getTime() < endTime) return i + 1
  }
  return null
}

export const getWorkSlotGridRange = (
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  slots: WorkSlot[]
): GridColumnRange | null => {
  const start = normalizePhaseDateTime(startValue, 'start')
  if (!start) return null
  const end = normalizePhaseDateTime(endValue, 'end') || new Date(start.getTime() + WORK_SLOT_MINUTES * MINUTE_MS)
  const startIndex = findFirstOverlappingSlotIndex(start, end, slots)
  const endIndex = findLastOverlappingSlotEndIndex(start, end, slots)

  if (startIndex === null || endIndex === null || endIndex <= startIndex) return null
  return {
    start: startIndex + 1,
    end: endIndex + 1
  }
}

export const getEffectiveWorkingMinutes = (
  start: Date,
  end: Date,
  config: WorkdayConfig = {}
): number => {
  if (end.getTime() <= start.getTime()) return 0

  let total = 0
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  while (current <= last) {
    if (isWorkday(current, config)) {
      for (const session of workSessionMinutes) {
        const sessionStart = setTimeOnDate(current, session.start)
        const sessionEnd = setTimeOnDate(current, session.end)
        const overlapStart = Math.max(start.getTime(), sessionStart.getTime())
        const overlapEnd = Math.min(end.getTime(), sessionEnd.getTime())
        if (overlapEnd > overlapStart) {
          total += Math.round((overlapEnd - overlapStart) / MINUTE_MS)
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return total
}

export const formatWorkingDuration = (minutes: number): string => {
  if (minutes <= 0) return '0 小时'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} 分钟`
  if (rest === 0) return `${hours} 小时`
  return `${hours} 小时 ${rest} 分钟`
}
