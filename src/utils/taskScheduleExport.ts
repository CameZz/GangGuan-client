import type { Task } from '@/types'

interface BuildTaskScheduleExportOptions {
  allTasks: Task[]
  planningName: string
  planningDeadline: string | null
  getStageLabel: (task: Task) => string
}

function formatPlanningDeadline(dateText: string | null): string {
  if (!dateText) {
    return '未设置截止日期'
  }
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) {
    return '未设置截止日期'
  }
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

function formatTaskTitle(task: Task): string {
  return task.title
}

export function buildTaskScheduleExport(tasks: Task[], options: BuildTaskScheduleExportOptions): string {
  const taskLines = tasks
    .filter(task => task.itemType === 'task')
    .sort((a, b) => formatTaskTitle(a).localeCompare(formatTaskTitle(b), 'zh-CN'))
    .map((task, index) => `${index + 1}.${formatTaskTitle(task)}---${options.getStageLabel(task)}`)

  if (taskLines.length === 0) return ''

  return [
    `${formatPlanningDeadline(options.planningDeadline)}·${options.planningName}`,
    ...taskLines
  ].join('\n')
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('copy failed')
  }
}
