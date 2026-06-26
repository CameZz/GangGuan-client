<script setup lang="ts">
import { ref, computed, nextTick, watchEffect, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore, useProjectStore, useMemberStore, usePlanningStore, useUserStore } from '@/stores'
import { ROLES } from '@/types'
import type { RoleType, Task, TaskPhase, TaskProgressHistory, DailyNote } from '@/types'
import {
  formatDateKey as formatScheduleDateKey,
  formatDateLabel,
  formatWorkingDuration,
  generateWorkSlots,
  getEffectiveWorkingMinutes,
  getWorkSlotGridRange,
  isWorkday as isScheduleWorkday,
  WORK_SLOTS_PER_DAY
} from '@/utils/workingSchedule'
import TaskModal from '@/components/task/TaskModal.vue'
import { dailyNoteApi } from '@/api/daily-notes'
import { unwrapApiData } from '@/api/index'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const planningStore = usePlanningStore()
const userStore = useUserStore()

const tasks = computed(() => taskStore.tasks)
const members = computed(() => {
  if (currentProjectId.value) {
    return projectStore.getProjectMemberUsers(currentProjectId.value)
  }
  return memberStore.members
})
const plannings = computed(() => planningStore.plannings)
const projects = computed(() => projectStore.projects)

const GRID_SLOT_WIDTH = 12.5
const MEMBER_INFO_WIDTH = 180
const MEMBER_INFO_PADDING_X = 16
const MEMBER_INFO_TOTAL_WIDTH = MEMBER_INFO_WIDTH + MEMBER_INFO_PADDING_X * 2 + 1
const scheduleScrollBody = ref<HTMLElement | null>(null)
const activeView = ref<'schedule' | 'progress'>('schedule')

// Task modal
const isModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)

function openEditTaskModal(task: Task) {
  selectedTask.value = task
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedTask.value = null
}

async function handleSave(taskData: Partial<Task>) {
  if (selectedTask.value) {
    await taskStore.updateTask(selectedTask.value.id, taskData, userStore.currentUser?.id)
  }
  closeModal()
}

async function handleDelete(taskId: string) {
  const success = await taskStore.deleteTask(taskId)
  if (success) closeModal()
}

// 从消息中心跳转时自动打开任务弹框
async function handleOpenTaskFromQuery() {
  const taskId = route.query.taskId as string | undefined
  if (!taskId) return
  await router.replace({ query: { ...route.query, taskId: undefined } })
  await nextTick()

  const projectId = route.params.projectId as string | undefined
  const task = await taskStore.fetchTaskById(taskId, projectId)
  if (!task) {
    alert('该任务已被删除')
    return
  }
  if (task.planningId && task.planningId !== projectStore.selectedPlanningId) {
    projectStore.setSelectedPlanning(task.planningId)
  }
  await nextTick()
  openEditTaskModal(task)
}

onMounted(() => {
  handleOpenTaskFromQuery()
})

watch(() => route.query.taskId, (taskId) => {
  if (taskId) {
    handleOpenTaskFromQuery()
  }
})

const filterRoles = ref<RoleType[]>([])

const toggleRole = (role: RoleType) => {
  const idx = filterRoles.value.indexOf(role)
  if (idx >= 0) filterRoles.value.splice(idx, 1)
  else filterRoles.value.push(role)
}

// Current project ID from route or store
const currentProjectId = ref<string>('')

watchEffect(() => {
  const projectId = route.params.projectId as string | undefined
  if (projectId) {
    currentProjectId.value = projectId
    if (projectStore.currentProjectId !== projectId) {
      projectStore.setCurrentProject(projectId)
    }
  } else if (projectStore.currentProjectId) {
    currentProjectId.value = projectStore.currentProjectId
  }
})

// Year/month selector
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 3; y <= current + 1; y++) years.push(y)
  return years
})

const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const formatDateKey = (date: Date): string => {
  return formatScheduleDateKey(date)
}

// Timeline range from selected year/month
const timelineStart = computed(() => {
  return new Date(selectedYear.value, selectedMonth.value - 1, 1)
})

const timelineEnd = computed(() => {
  return new Date(selectedYear.value, selectedMonth.value, 0)
})

// Day slots
interface DaySlot {
  date: Date
  dateStr: string
  dayIndex: number
}

const daySlots = computed<DaySlot[]>(() => {
  const start = timelineStart.value
  const end = timelineEnd.value
  const days: DaySlot[] = []
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  let dayIndex = 0
  while (current <= endDate) {
    days.push({
      date: new Date(current),
      dateStr: formatDateLabel(current),
      dayIndex
    })
    current.setDate(current.getDate() + 1)
    dayIndex++
  }
  return days
})

// All tasks (global view, no project/planning filter)
const allTasks = computed(() => tasks.value.filter(t => taskStore.isTaskItem(t)))

const taskById = computed(() => {
  const map = new Map<string, Task>()
  for (const task of allTasks.value) {
    map.set(task.id, task)
  }
  return map
})

const progressHistoriesData = ref<TaskProgressHistory[]>([])

// 加载进度历史数据
async function loadProgressHistories() {
  if (!currentProjectId.value) {
    progressHistoriesData.value = []
    return
  }
  progressHistoriesData.value = await taskStore.getProjectTaskProgressHistories(currentProjectId.value)
}

// 当项目ID变化时重新加载
watch(currentProjectId, loadProgressHistories, { immediate: true })

// 加载每日备注数据
const dailyNotesData = ref<DailyNote[]>([])

async function loadDailyNotes() {
  if (!currentProjectId.value) {
    dailyNotesData.value = []
    return
  }
  const startDate = formatDateKey(timelineStart.value)
  const endDate = formatDateKey(timelineEnd.value)
  try {
    const data = unwrapApiData<{ notes: DailyNote[] }>(
      await dailyNoteApi.getByDateRange(currentProjectId.value, startDate, endDate) 
    )
    dailyNotesData.value = data?.notes || []
  } catch (error) {
    console.error('加载每日备注失败:', error)
    dailyNotesData.value = []
  }
}

watch([currentProjectId, selectedYear, selectedMonth], loadDailyNotes, { immediate: true })

const monthDailyNotes = computed(() => dailyNotesData.value)

const monthProgressHistories = computed(() => {
  const rangeStart = timelineStart.value.getTime()
  const rangeEnd = timelineEnd.value.getTime() + 24 * 60 * 60 * 1000
  return progressHistoriesData.value.filter(history => {
    const changedAt = new Date(history.createdAt).getTime()
    return changedAt >= rangeStart && changedAt < rangeEnd
  })
})

const progressOwnerIds = computed(() => {
  const ids = new Set<string>()
  for (const history of monthProgressHistories.value) {
    if (history.assigneeId) ids.add(history.assigneeId)
  }
  return ids
})

// Group tasks by memberId
interface MemberTaskItem {
  task: typeof tasks.value[0]
  phase: TaskPhase
  rowIndex: number
  zIndex: number
  isShadowed: boolean
}

const assignRowIndices = (items: Array<Omit<MemberTaskItem, 'rowIndex' | 'zIndex' | 'isShadowed'>>): MemberTaskItem[] => {
  const sortedItems = [...items].sort((a, b) => {
    const aStart = a.phase.startTime ? new Date(a.phase.startTime).getTime() : Number.MAX_SAFE_INTEGER
    const bStart = b.phase.startTime ? new Date(b.phase.startTime).getTime() : Number.MAX_SAFE_INTEGER
    return aStart - bStart
  })

  return sortedItems.map((item, index) => {
    let isShadowed = false
    for (let i = 0; i < index; i++) {
      const earlier = sortedItems[i]
      if (rangesOverlap(
        { start: item.phase.startTime, end: item.phase.endTime },
        { start: earlier.phase.startTime, end: earlier.phase.endTime }
      )) {
        isShadowed = true
        break
      }
    }

    return {
      ...item,
      rowIndex: 0,
      zIndex: sortedItems.length - index,
      isShadowed
    }
  })
}

const memberScheduleData = computed(() => {
  const memberMap = new Map<string, Array<Omit<MemberTaskItem, 'rowIndex' | 'zIndex' | 'isShadowed'>>>()

  const rangeStart = timelineStart.value.getTime()
  const rangeEnd = timelineEnd.value.getTime() + 24 * 60 * 60 * 1000

  for (const task of allTasks.value) {
    if (currentProjectId.value && task.projectId !== currentProjectId.value) continue
    for (const phase of task.phases) {
      if (!phase.assigneeId || !phase.startTime) continue
      if (!getWorkSlotGridRange(phase.startTime, phase.endTime, workSlots.value)) continue
      const taskStart = new Date(phase.startTime).getTime()
      const taskEnd = phase.endTime ? new Date(phase.endTime).getTime() : taskStart + 24 * 60 * 60 * 1000
      if (taskEnd < rangeStart || taskStart >= rangeEnd) continue
      if (!memberMap.has(phase.assigneeId)) {
        memberMap.set(phase.assigneeId, [])
      }
      memberMap.get(phase.assigneeId)!.push({ task, phase })
    }
  }

  for (const memberId of progressOwnerIds.value) {
    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, [])
    }
  }

  // Build member list (only current project members)
  const result: Array<{
    memberId: string
    memberName: string
    memberAvatar: string
    memberRole: RoleType
    items: MemberTaskItem[]
  }> = []

  for (const [memberId, items] of memberMap) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) continue
    if (filterRoles.value.length > 0 && !filterRoles.value.includes(member.role)) continue
    result.push({
      memberId,
      memberName: member.name,
      memberAvatar: member.avatar,
      memberRole: member.role,
      items: assignRowIndices(items)
    })
  }

  return result
})

// Planning color palette
const PLANNING_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#f43f5e', '#06b6d4']

const planningColorMap = computed(() => {
  const map = new Map<string, string>()
  const allPlannings = plannings.value
  allPlannings.forEach((p, index) => {
    map.set(p.id, p.color || PLANNING_COLORS[index % PLANNING_COLORS.length])
  })
  return map
})

const getPlanningColor = (planningId: string | null): string => {
  if (!planningId) return '#6b7280'
  return planningColorMap.value.get(planningId) || '#6b7280'
}

const getProjectName = (projectId: string): string => {
  const proj = projects.value.find(p => p.id === projectId)
  return proj?.name || '未知项目'
}

const getPlanningName = (planningId: string | null, projectId?: string): string => {
  if (!planningId) return '未分配迭代'
  const p = plannings.value.find(p => p.id === planningId)
  if (!p) return '未知迭代'
  if (projectId) return `${getProjectName(projectId)} - ${p.name}`
  return p.name
}

interface ProgressDetail {
  id: string
  taskTitle: string
  planningName: string
  phaseName: string
  ownerName: string
  operatorName: string
  oldProgress: number
  newProgress: number
  delta: number
  createdAt: string
}

interface ProgressCell {
  memberId: string
  memberName: string
  dateKey: string
  dateLabel: string
  count: number
  netDelta: number
  details: ProgressDetail[]
  note: { content: string; updatedAt: string } | null
}

interface MemberProgressRow {
  memberId: string
  memberName: string
  memberAvatar: string
  memberRole: RoleType
  cells: Array<ProgressCell | null>
}

const getMemberName = (memberId: string | null): string => {
  if (!memberId) return '未分配'
  return members.value.find(member => member.id === memberId)?.name || '未知成员'
}

const formatSignedDelta = (delta: number): string => `${delta >= 0 ? '+' : ''}${delta}pp`

const memberProgressData = computed<MemberProgressRow[]>(() => {
  // Group progress histories by memberId and dateKey
  const grouped = new Map<string, Map<string, ProgressDetail[]>>()

  for (const history of monthProgressHistories.value) {
    if (!history.assigneeId) continue
    const task = taskById.value.get(history.taskId)
    if (!task) continue
    const dateKey = formatDateKey(new Date(history.createdAt))
    if (!grouped.has(history.assigneeId)) grouped.set(history.assigneeId, new Map())
    const ownerDays = grouped.get(history.assigneeId)!
    if (!ownerDays.has(dateKey)) ownerDays.set(dateKey, [])
    ownerDays.get(dateKey)!.push({
      id: history.id,
      taskTitle: task.title,
      planningName: getPlanningName(task.planningId, task.projectId),
      phaseName: history.phaseName,
      ownerName: getMemberName(history.assigneeId),
      operatorName: getMemberName(history.operatorId),
      oldProgress: history.oldProgress,
      newProgress: history.newProgress,
      delta: history.newProgress - history.oldProgress,
      createdAt: history.createdAt
    })
  }

  // Group daily notes by memberId and dateKey
  const noteMap = new Map<string, Map<string, DailyNote>>()
  for (const note of monthDailyNotes.value) {
    if (!noteMap.has(note.memberId)) noteMap.set(note.memberId, new Map())
    noteMap.get(note.memberId)!.set(note.dateKey, note)
  }

  // Collect all memberIds that have either progress or notes
  const allMemberIds = new Set<string>([...grouped.keys(), ...noteMap.keys()])

  const rows: MemberProgressRow[] = []
  for (const memberId of allMemberIds) {
    const member = members.value.find(m => m.id === memberId)
    if (!member) continue
    if (filterRoles.value.length > 0 && !filterRoles.value.includes(member.role)) continue

    const dayMap = grouped.get(memberId)
    const memberNotes = noteMap.get(memberId)

    const cells = visibleDaySlots.value.map(day => {
      const dateKey = formatDateKey(day.date)
      const details = dayMap?.get(dateKey)
      const note = memberNotes?.get(dateKey) || null

      const hasDetails = details && details.length > 0
      if (!hasDetails && !note) return null

      const sortedDetails = hasDetails
        ? [...details!].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : []

      return {
        memberId,
        memberName: member.name,
        dateKey,
        dateLabel: day.dateStr,
        count: sortedDetails.length,
        netDelta: sortedDetails.reduce((sum, detail) => sum + detail.delta, 0),
        details: sortedDetails,
        note: note ? { content: note.content, updatedAt: note.updatedAt } : null
      }
    })

    if (cells.some(Boolean)) {
      rows.push({
        memberId,
        memberName: member.name,
        memberAvatar: member.avatar,
        memberRole: member.role,
        cells
      })
    }
  }

  return rows.sort((a, b) => a.memberName.localeCompare(b.memberName))
})

const selectedProgressCell = ref<ProgressCell | null>(null)

const selectProgressCell = (cell: ProgressCell | null) => {
  selectedProgressCell.value = cell
  // Reset note editing state when switching cells
  isEditingNote.value = false
  editingNoteContent.value = ''
  addingNoteFor.value = null
}

// Note editing state
const isEditingNote = ref(false)
const editingNoteContent = ref('')
const isSavingNote = ref(false)
const addingNoteFor = ref<{ memberId: string; dateKey: string; dateLabel: string } | null>(null)

function startAddNote(memberId: string, dateKey: string, dateLabel: string) {
  selectedProgressCell.value = null
  addingNoteFor.value = { memberId, dateKey, dateLabel }
  editingNoteContent.value = ''
  isEditingNote.value = true
}

function startEditNote(content: string) {
  editingNoteContent.value = content
  isEditingNote.value = true
}

function cancelEditNote() {
  isEditingNote.value = false
  editingNoteContent.value = ''
  if (addingNoteFor.value) {
    addingNoteFor.value = null
  }
}

async function saveNote() {
  const content = editingNoteContent.value.trim()
  if (!content) return

  const projectId = currentProjectId.value
  if (!projectId) return

  let dateKey: string
  let memberId: string

  if (addingNoteFor.value) {
    dateKey = addingNoteFor.value.dateKey
    memberId = addingNoteFor.value.memberId
  } else if (selectedProgressCell.value) {
    dateKey = selectedProgressCell.value.dateKey
    memberId = selectedProgressCell.value.memberId
  } else {
    return
  }

  if (userStore.currentUser?.id !== memberId) return

  isSavingNote.value = true
  try {
    await dailyNoteApi.upsert(projectId, dateKey, content)
    await loadDailyNotes()
    isEditingNote.value = false
    editingNoteContent.value = ''
    addingNoteFor.value = null
  } catch (error) {
    console.error('保存备注失败:', error)
  } finally {
    isSavingNote.value = false
  }
}

async function deleteNote() {
  const projectId = currentProjectId.value
  if (!projectId || !selectedProgressCell.value) return

  const { memberId, dateKey } = selectedProgressCell.value
  if (userStore.currentUser?.id !== memberId) return

  try {
    await dailyNoteApi.remove(projectId, dateKey)
    await loadDailyNotes()
    // If the cell now has no details either, close the panel
    if (selectedProgressCell.value.details.length === 0) {
      selectedProgressCell.value = null
    }
  } catch (error) {
    console.error('删除备注失败:', error)
  }
}

// Bar style for a task phase
const getBarStyle = (item: MemberTaskItem) => {
  const range = getWorkSlotGridRange(item.phase.startTime, item.phase.endTime, workSlots.value)
  if (!range) return { display: 'none' }
  return {
    gridColumn: `${range.start} / ${range.end}`,
    gridRow: `${item.rowIndex + 1}`
  }
}

// Overlap detection: check if two time ranges overlap
const rangesOverlap = (a: { start: string | null, end: string | null }, b: { start: string | null, end: string | null }): boolean => {
  if (!a.start || !b.start) return false
  const aStart = new Date(a.start)
  const aEnd = a.end ? new Date(a.end) : new Date(aStart.getTime() + 30 * 60 * 1000)
  const bStart = new Date(b.start)
  const bEnd = b.end ? new Date(b.end) : new Date(bStart.getTime() + 30 * 60 * 1000)
  const overlapStart = new Date(Math.max(aStart.getTime(), bStart.getTime()))
  const overlapEnd = new Date(Math.min(aEnd.getTime(), bEnd.getTime()))
  return getEffectiveWorkingMinutes(overlapStart, overlapEnd, workdayConfig.value) > 0
}

// Tooltip
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<{ taskName: string, planningName: string, stage: string, priority: string, timeRange: string, duration: string } | null>(null)

const priorityLabels: Record<string, string> = { low: '低', medium: '中', high: '高' }
const formatPhaseDateTime = (value: string | null): string => {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showTooltip = (e: MouseEvent, item: MemberTaskItem) => {
  const duration = item.phase.startTime && item.phase.endTime
    ? getEffectiveWorkingMinutes(new Date(item.phase.startTime), new Date(item.phase.endTime), workdayConfig.value)
    : 0
  tooltipData.value = {
    taskName: item.task.title,
    planningName: getPlanningName(item.task.planningId, item.task.projectId),
    stage: taskStore.getTaskStageLabel(item.task),
    priority: priorityLabels[item.task.priority] || item.task.priority,
    timeRange: `${formatPhaseDateTime(item.phase.startTime)} - ${formatPhaseDateTime(item.phase.endTime)}`,
    duration: formatWorkingDuration(duration)
  }
  tooltipX.value = e.clientX + 12
  tooltipY.value = e.clientY - 8
  tooltipVisible.value = true
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const moveTooltip = (e: MouseEvent) => {
  tooltipX.value = e.clientX + 12
  tooltipY.value = e.clientY - 8
}

// Role name
const roleNames: Record<RoleType, string> = {
  pm: 'PM', planner: '策划', artist: '美术', ui: 'UI',
  server: '程序(服务端)', client: '程序(客户端)', devops: '运维',
  animator: '动作/特效', sound: '音效', tester: '测试'
}
const getRoleName = (role: RoleType): string => roleNames[role] || role

// Workday logic
const canEditWorkday = computed(() => userStore.isAdmin || userStore.currentUser?.role === 'pm')
const canEditNote = (memberId: string) => userStore.currentUser?.id === memberId

const workdayConfig = computed(() => ({
  nonWorkdays: projectStore.currentProject?.nonWorkdays || [],
  extraWorkdays: projectStore.currentProject?.extraWorkdays || []
}))

const isWorkday = (date: Date): boolean => {
  return isScheduleWorkday(date, workdayConfig.value)
}

const toggleWorkday = async (date: Date) => {
  const project = projectStore.currentProject
  if (!project) return

  const key = formatDateKey(date)
  const day = date.getDay()
  const isDefaultWorkday = day >= 1 && day <= 5

  const nonWorkdays = [...(project.nonWorkdays || [])]
  const extraWorkdays = [...(project.extraWorkdays || [])]

  if (isDefaultWorkday) {
    const idx = nonWorkdays.indexOf(key)
    if (idx >= 0) {
      nonWorkdays.splice(idx, 1)
    } else {
      nonWorkdays.push(key)
    }
  } else {
    const idx = extraWorkdays.indexOf(key)
    if (idx >= 0) {
      extraWorkdays.splice(idx, 1)
    } else {
      extraWorkdays.push(key)
    }
  }

  await projectStore.updateProject(project.id, { nonWorkdays, extraWorkdays })
}

// Collapse rest days
const collapseRestDays = ref(false)

const visibleDaySlots = computed(() => {
  if (!collapseRestDays.value) return daySlots.value
  return daySlots.value.filter(day => isWorkday(day.date))
})

const visibleWorkDays = computed(() => visibleDaySlots.value.filter(day => isWorkday(day.date)))

const workSlots = computed(() => generateWorkSlots(visibleDaySlots.value, workdayConfig.value, {
  includeRestDays: !collapseRestDays.value
}))

const visibleTotalSlots = computed(() => visibleDaySlots.value.length * WORK_SLOTS_PER_DAY)

const dayIndexToVisibleCol = computed(() => {
  if (!collapseRestDays.value) return null
  const map = new Map<number, number>()
  let col = 0
  for (const day of daySlots.value) {
    if (isWorkday(day.date)) {
      map.set(day.dayIndex, col)
      col++
    }
  }
  return map
})

const visibleGridWidth = computed(() => `${visibleTotalSlots.value * GRID_SLOT_WIDTH}px`)
const progressGridWidth = computed(() => `${visibleDaySlots.value.length * GRID_SLOT_WIDTH * WORK_SLOTS_PER_DAY}px`)

const hasAutoScrolledToToday = ref(false)
const todayKey = formatDateKey(now)

const scrollScheduleToToday = (): boolean => {
  const scrollBody = scheduleScrollBody.value
  if (!scrollBody) return false

  const todayVisibleIndex = visibleWorkDays.value.findIndex(day => formatDateKey(day.date) === todayKey)
  if (todayVisibleIndex < 0) return false

  const dayWidth = GRID_SLOT_WIDTH * WORK_SLOTS_PER_DAY
  const gridViewportWidth = Math.max(scrollBody.clientWidth - MEMBER_INFO_TOTAL_WIDTH, 0)
  const todayCenter = todayVisibleIndex * dayWidth + dayWidth / 2
  scrollBody.scrollLeft = Math.max(0, todayCenter - gridViewportWidth / 2)
  return true
}

watchEffect(() => {
  if (hasAutoScrolledToToday.value) return
  if (selectedYear.value !== now.getFullYear() || selectedMonth.value !== now.getMonth() + 1) return
  if (memberScheduleData.value.length === 0 && memberProgressData.value.length === 0) return
  if (visibleDaySlots.value.length === 0) return

  void nextTick(() => {
    if (hasAutoScrolledToToday.value) return
    hasAutoScrolledToToday.value = scrollScheduleToToday()
  })
})

// Active plannings for legend (with project info)
const activePlannings = computed(() => {
  const seen = new Set<string>()
  const result: Array<{ id: string, name: string, projectId: string }> = []
  const visibleProgressTaskIds = new Set(monthProgressHistories.value.map(history => history.taskId))

  for (const task of allTasks.value) {
    if (currentProjectId.value && task.projectId !== currentProjectId.value) continue
    if (!task.planningId) continue
    const hasVisibleSchedule = task.phases.some(phase => {
      return getWorkSlotGridRange(phase.startTime, phase.endTime, workSlots.value) !== null
    })
    if (!hasVisibleSchedule && !visibleProgressTaskIds.has(task.id)) continue
    const key = `${task.projectId}:${task.planningId}`
    if (seen.has(key)) continue
    seen.add(key)
    const planning = plannings.value.find(p => p.id === task.planningId)
    if (planning) {
      result.push({ id: planning.id, name: planning.name, projectId: task.projectId })
    }
  }
  return result
})
</script>

<template>
  <div class="page schedule-page">
    <div class="page-header">
      <div class="header-content">
        <h2>成员排期表</h2>
        <div class="view-switch" aria-label="成员排期视图切换">
          <button
            class="view-switch-button"
            :class="{ active: activeView === 'schedule' }"
            @click="activeView = 'schedule'"
          >
            成员排期
          </button>
          <button
            class="view-switch-button"
            :class="{ active: activeView === 'progress' }"
            @click="activeView = 'progress'"
          >
            阶段进度
          </button>
        </div>
      </div>
      <div class="header-actions">
        <div class="role-filter-group">
          <button
            v-for="role in ROLES"
            :key="role.type"
            class="role-chip"
            :class="{ active: filterRoles.includes(role.type) }"
            @click="toggleRole(role.type)"
          >
            {{ role.name }}
          </button>
        </div>
        <select v-model="selectedYear" class="input select select-xs">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select v-model="selectedMonth" class="input select select-xs">
          <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}月</option>
        </select>
        <button
          class="collapse-toggle"
          :class="{ active: collapseRestDays }"
          @click="collapseRestDays = !collapseRestDays"
        >
          {{ collapseRestDays ? '展开休息日' : '折叠休息日' }}
        </button>
      </div>
    </div>

    <template v-if="activeView === 'schedule'">
      <div v-if="memberScheduleData.length === 0" class="empty-state">
        <p>暂无任务数据</p>
      </div>

      <div v-else class="schedule-wrapper">
        <div ref="scheduleScrollBody" class="schedule-scroll-body">
          <!-- Header row (sticky top) -->
          <div class="schedule-row schedule-row--header">
            <div class="member-info member-info--header">成员</div>
            <div
              class="schedule-grid-header"
              :style="{
                gridTemplateColumns: `repeat(${visibleTotalSlots}, ${GRID_SLOT_WIDTH}px)`,
                minWidth: visibleGridWidth
              }"
            >
              <template v-for="(day, di) in visibleDaySlots" :key="day.dayIndex">
                <div
                  class="date-label"
                  :class="{ 'non-workday': !isWorkday(day.date), 'can-edit': canEditWorkday }"
                  :style="{ gridColumn: `${di * WORK_SLOTS_PER_DAY + 1} / ${(di + 1) * WORK_SLOTS_PER_DAY + 1}` }"
                  @click="canEditWorkday ? toggleWorkday(day.date) : undefined"
                >
                  {{ day.dateStr }}
                  <span v-if="!isWorkday(day.date)" class="rest-badge">休</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Member rows -->
          <div
            v-for="memberData in memberScheduleData"
            :key="memberData.memberId"
            class="schedule-row"
          >
            <div class="member-info">
              <img :src="memberData.memberAvatar" :alt="memberData.memberName" class="member-avatar" />
              <div class="member-details">
                <div class="member-name">{{ memberData.memberName }}</div>
                <div class="member-role">{{ getRoleName(memberData.memberRole) }}</div>
              </div>
            </div>

            <div class="member-grid" :style="{ gridTemplateColumns: `repeat(${visibleTotalSlots}, ${GRID_SLOT_WIDTH}px)`, minWidth: visibleGridWidth }">
              <!-- Grid cells -->
              <div
                v-for="(day, di) in visibleDaySlots"
                :key="day.dayIndex"
                class="grid-cell day-start"
                :class="{ 'non-workday-cell': !isWorkday(day.date) }"
                :style="{ gridColumn: `${di * WORK_SLOTS_PER_DAY + 1} / ${(di + 1) * WORK_SLOTS_PER_DAY + 1}` }"
              ></div>

              <!-- Task bars -->
              <div
                v-for="(item, index) in memberData.items"
                :key="`${item.task.id}-${index}`"
                class="task-bar"
                :class="{ 'is-shadowed': item.isShadowed }"
                :style="{
                  ...getBarStyle(item),
                  backgroundColor: getPlanningColor(item.task.planningId),
                  zIndex: item.zIndex,
                  borderColor: item.isShadowed ? getPlanningColor(item.task.planningId) : undefined
                }"
                @mouseenter="showTooltip($event, item)"
                @mouseleave="hideTooltip"
                @mousemove="moveTooltip"
                @click="openEditTaskModal(item.task)"
              >
                <span class="bar-label">{{ item.task.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="memberProgressData.length === 0" class="empty-state">
        <p>暂无阶段进度变更</p>
      </div>

      <div v-else class="schedule-wrapper progress-wrapper">
        <div ref="scheduleScrollBody" class="schedule-scroll-body">
          <div class="schedule-row schedule-row--header">
            <div class="member-info member-info--header">成员</div>
            <div
              class="schedule-grid-header"
              :style="{
                gridTemplateColumns: `repeat(${visibleDaySlots.length}, ${GRID_SLOT_WIDTH * WORK_SLOTS_PER_DAY}px)`,
                minWidth: progressGridWidth
              }"
            >
              <template v-for="(day, vi) in visibleDaySlots" :key="day.dayIndex">
                <div
                  class="date-label"
                  :class="{ 'non-workday': !isWorkday(day.date), 'can-edit': canEditWorkday }"
                  :style="{ gridColumn: `${vi + 1} / ${vi + 2}` }"
                  @click="canEditWorkday ? toggleWorkday(day.date) : undefined"
                >
                  {{ day.dateStr }}
                  <span v-if="!isWorkday(day.date)" class="rest-badge">休</span>
                </div>
              </template>
            </div>
          </div>

          <div
            v-for="memberData in memberProgressData"
            :key="memberData.memberId"
            class="schedule-row"
          >
            <div class="member-info">
              <img :src="memberData.memberAvatar" :alt="memberData.memberName" class="member-avatar" />
              <div class="member-details">
                <div class="member-name">{{ memberData.memberName }}</div>
                <div class="member-role">{{ getRoleName(memberData.memberRole) }}</div>
              </div>
            </div>

            <div
              class="progress-grid"
              :style="{ gridTemplateColumns: `repeat(${visibleDaySlots.length}, ${GRID_SLOT_WIDTH * WORK_SLOTS_PER_DAY}px)`, minWidth: progressGridWidth }"
            >
              <div
                v-for="(cell, index) in memberData.cells"
                :key="visibleDaySlots[index].dayIndex"
                class="progress-cell"
                :class="{ 'non-workday-cell': !isWorkday(visibleDaySlots[index].date), selected: cell && selectedProgressCell?.memberId === cell.memberId && selectedProgressCell?.dateKey === cell.dateKey }"
              >
                <!-- Combined card: note + progress details -->
                <button
                  v-if="cell && cell.note && cell.details.length > 0"
                  class="progress-cell-button has-note"
                  :class="{ negative: cell.netDelta < 0 }"
                  @click="selectProgressCell(cell)"
                >
                  <div class="progress-cell-note-preview">📝 {{ cell.note.content.length > 30 ? cell.note.content.slice(0, 30) + '…' : cell.note.content }}</div>
                  <div class="progress-cell-details">
                    <div v-for="detail in cell.details" :key="detail.id" class="progress-cell-detail-item">
                      <span class="detail-task">{{ detail.taskTitle }}</span>
                      <span class="detail-sep">-</span>
                      <span class="detail-phase">{{ detail.phaseName }}</span>
                      <span class="detail-sep">-</span>
                      <span class="detail-change">{{ detail.oldProgress }}%→{{ detail.newProgress }}%</span>
                    </div>
                  </div>
                </button>
                <!-- Note-only card -->
                <button
                  v-else-if="cell && cell.note"
                  class="progress-cell-button note-only"
                  @click="selectProgressCell(cell)"
                >
                  <div class="progress-cell-note-preview">📝 {{ cell.note.content.length > 50 ? cell.note.content.slice(0, 50) + '…' : cell.note.content }}</div>
                </button>
                <!-- Progress-only card (existing) -->
                <button
                  v-else-if="cell"
                  class="progress-cell-button"
                  :class="{ negative: cell.netDelta < 0 }"
                  @click="selectProgressCell(cell)"
                >
                  <div class="progress-cell-details">
                    <div v-for="detail in cell.details" :key="detail.id" class="progress-cell-detail-item">
                      <span class="detail-task">{{ detail.taskTitle }}</span>
                      <span class="detail-sep">-</span>
                      <span class="detail-phase">{{ detail.phaseName }}</span>
                      <span class="detail-sep">-</span>
                      <span class="detail-change">{{ detail.oldProgress }}%→{{ detail.newProgress }}%</span>
                    </div>
                  </div>
                </button>
                <!-- Empty cell: + button for current user -->
                <button
                  v-else-if="canEditNote(memberData.memberId)"
                  class="progress-cell-add"
                  @click="startAddNote(memberData.memberId, formatDateKey(visibleDaySlots[index].date), visibleDaySlots[index].dateStr)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedProgressCell || addingNoteFor" class="progress-detail-panel">
        <div class="progress-detail-header">
          <div>
            <div class="progress-detail-title">
              {{ selectedProgressCell?.memberName || getMemberName(addingNoteFor?.memberId || '') }} · {{ selectedProgressCell?.dateLabel || addingNoteFor?.dateLabel }}
            </div>
            <div v-if="selectedProgressCell && selectedProgressCell.count > 0" class="progress-detail-subtitle">
              {{ selectedProgressCell.count }}次变更，净变化 {{ formatSignedDelta(selectedProgressCell.netDelta) }}
            </div>
          </div>
          <button class="progress-detail-close" @click="selectProgressCell(null); addingNoteFor = null">关闭</button>
        </div>

        <!-- Note section -->
        <div v-if="selectedProgressCell || addingNoteFor || isEditingNote" class="note-section">
          <div class="note-section-header">
            <span class="note-section-title">📝 今日备注</span>
            <div v-if="!isEditingNote && canEditNote(selectedProgressCell?.memberId || addingNoteFor?.memberId || '')" class="note-actions">
              <button class="btn btn-ghost btn-sm" @click="startEditNote(selectedProgressCell?.note?.content || '')">{{ selectedProgressCell?.note ? '编辑' : '添加' }}</button>
              <button v-if="selectedProgressCell?.note" class="btn btn-ghost btn-sm danger" @click="deleteNote">删除</button>
            </div>
          </div>
          <div v-if="isEditingNote" class="note-edit">
            <textarea
              v-model="editingNoteContent"
              class="note-textarea"
              placeholder="填写今天的工作内容..."
              rows="4"
            ></textarea>
            <div class="note-edit-actions">
              <button class="btn btn-primary btn-sm" :disabled="isSavingNote || !editingNoteContent.trim()" @click="saveNote">
                {{ isSavingNote ? '保存中...' : '保存' }}
              </button>
              <button class="btn btn-secondary btn-sm" @click="cancelEditNote">取消</button>
            </div>
          </div>
          <div v-else-if="selectedProgressCell?.note" class="note-content">
            {{ selectedProgressCell.note.content }}
          </div>
          <div v-else class="note-empty-hint">
            暂无备注
          </div>
        </div>

        <!-- Progress details section -->
        <div v-if="selectedProgressCell && selectedProgressCell.details.length > 0" class="progress-detail-list">
          <div
            v-for="detail in selectedProgressCell.details"
            :key="detail.id"
            class="progress-detail-item"
          >
            <div class="progress-detail-main">
              <span class="progress-task-title">{{ detail.taskTitle }}</span>
              <span class="progress-phase-name">{{ detail.phaseName }}</span>
              <span class="progress-change" :class="{ negative: detail.delta < 0 }">
                {{ detail.oldProgress }}% → {{ detail.newProgress }}%
                <strong>{{ formatSignedDelta(detail.delta) }}</strong>
              </span>
            </div>
            <div class="progress-detail-meta">
              <span>迭代：{{ detail.planningName }}</span>
              <span>负责人：{{ detail.ownerName }}</span>
              <span>修改人：{{ detail.operatorName }}</span>
              <span>{{ new Date(detail.createdAt).toLocaleString('zh-CN') }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Legend -->
    <div class="schedule-legend">
      <div
        v-for="planning in activePlannings"
        :key="`${planning.projectId}-${planning.id}`"
        class="legend-item"
      >
        <span class="legend-color" :style="{ backgroundColor: getPlanningColor(planning.id) }"></span>
        <span class="legend-label">{{ planning.name }}</span>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltipVisible && tooltipData"
        class="schedule-tooltip"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      >
        <div class="tooltip-title">{{ tooltipData.taskName }}</div>
        <div class="tooltip-row">迭代：{{ tooltipData.planningName }}</div>
        <div class="tooltip-row">阶段：{{ tooltipData.stage }}</div>
        <div class="tooltip-row">时间：{{ tooltipData.timeRange }}</div>
        <div class="tooltip-row">有效工时：{{ tooltipData.duration }}</div>
        <div class="tooltip-row">优先级：{{ tooltipData.priority }}</div>
      </div>
    </Teleport>

    <TaskModal
      :is-open="isModalOpen"
      :task="selectedTask"
      :project-id="currentProjectId"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.schedule-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.view-switch {
  display: inline-flex;
  width: fit-content;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
}

.view-switch-button {
  min-width: 88px;
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-switch-button:hover {
  color: var(--color-primary);
}

.view-switch-button.active {
  background-color: var(--color-primary);
  color: #fff;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-actions .select-xs {
  min-width: 100px;
  width: 100px;
}

.role-filter-group {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.role-chip {
  padding: 4px 10px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.role-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.role-chip.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.collapse-toggle {
  padding: 4px 10px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.collapse-toggle.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--color-text-muted);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

/* Schedule table layout */
.schedule-wrapper {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.schedule-scroll-body {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
}

/* All rows */
.schedule-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  min-width: fit-content;
}

.schedule-row:last-child {
  border-bottom: none;
}

/* Header row - sticky top */
.schedule-row--header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg-secondary);
}

.schedule-row--header .schedule-grid-header {
  display: grid;
  flex: 1;
  min-width: fit-content;
  will-change: transform;
}

/* Left column - member info */
.member-info {
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  padding: 10px 16px;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  position: sticky;
  left: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-info--header {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  position: sticky;
  left: 0;
  z-index: 15;
  padding: 12px 16px;
  justify-content: center;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* Date labels */
.date-label {
  text-align: center;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-right: 2px solid var(--color-border);
  position: relative;
}

.work-time-label {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.date-label.non-workday {
  background-color: #e5e7eb;
  color: #6b7280;
}

.date-label.can-edit {
  cursor: pointer;
  user-select: none;
}

.date-label.can-edit:hover {
  background-color: var(--color-bg-secondary);
}

.rest-badge {
  display: inline-block;
  font-size: 10px;
  color: #ef4444;
  font-weight: 600;
  margin-left: 2px;
}

/* Grid area */
.member-grid {
  display: grid;
  position: relative;
  grid-template-rows: 40px;
  align-items: center;
  padding: 8px 0;
}

.grid-cell {
  grid-row: 1;
  border-right: 1px solid var(--color-border);
  opacity: 0.3;
  min-height: 40px;
}

.grid-cell.day-start {
  border-left: 2px solid var(--color-border);
}

.non-workday-cell {
  background-color: #e5e7eb;
}

/* Task bars */
.task-bar {
  position: relative;
  height: 32px;
  margin: 0 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  grid-row: 1;
}

.task-bar:hover {
  opacity: 0.85;
}

.task-bar.is-shadowed {
  opacity: 0.4;
  border: 2px solid;
  background-clip: padding-box;
}

.bar-label {
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.progress-grid {
  display: grid;
  position: relative;
  min-height: 80px;
}

.progress-cell {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: 80px;
  padding: 4px;
  border-right: 1px solid var(--color-border);
  border-left: 1px solid transparent;
}

.progress-cell.selected {
  border-color: var(--color-primary);
  background-color: rgba(59, 130, 246, 0.08);
}

.progress-cell-button {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 4px 6px;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-sm);
  background-color: #dcfce7;
  color: #15803d;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.progress-cell-button:hover {
  border-color: #86efac;
  transform: translateY(-1px);
}

.progress-cell-button.negative {
  border-color: #fecaca;
  background-color: #fee2e2;
  color: #b91c1c;
}


.progress-cell-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.progress-cell-detail-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-task {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.detail-sep {
  flex-shrink: 0;
  opacity: 0.5;
}

.detail-phase {
  flex-shrink: 0;
}

.detail-change {
  flex-shrink: 0;
  font-weight: 600;
}

.progress-detail-panel {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-primary);
}

.progress-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.progress-detail-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.progress-detail-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.progress-detail-close {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.progress-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-detail-item {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-tertiary);
}

.progress-detail-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.progress-task-title {
  min-width: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-phase-name {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.progress-change {
  flex: 0 0 auto;
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
}

.progress-change.negative {
  color: #b91c1c;
}

.progress-change strong {
  margin-left: 6px;
}

.progress-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
}

/* Note-only card */
.progress-cell-button.note-only {
  border-color: #bfdbfe;
  background-color: #dbeafe;
  color: #1e40af;
}

.progress-cell-button.note-only:hover {
  border-color: #93c5fd;
}

/* Combined card: note + progress */
.progress-cell-button.has-note {
  border-color: #bbf7d0;
  background-color: #dcfce7;
  color: #15803d;
  gap: 3px;
}

.progress-cell-button.has-note .progress-cell-note-preview {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 3px;
  margin-bottom: 1px;
}

/* Note preview in cell */
.progress-cell-note-preview {
  font-size: 10px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  color: #1e40af;
}

/* Add note button for empty cells */
.progress-cell-add {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  padding: 4px;
  border: 1px dashed #cbd5e1;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.progress-cell-add:hover {
  border-color: #60a5fa;
  background-color: #eff6ff;
  color: #3b82f6;
}

/* Note section in detail panel */
.note-section {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-md);
  background-color: #eff6ff;
}

.note-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.note-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
}

.note-actions {
  display: flex;
  gap: 4px;
}

.note-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.note-empty-hint {
  font-size: 12px;
  color: #94a3b8;
}

.note-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #93c5fd;
  border-radius: var(--radius-sm);
  background-color: #fff;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
}

.note-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.note-edit-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* Legend */
.schedule-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
}

.legend-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Tooltip */
.schedule-tooltip {
  position: fixed;
  z-index: 9999;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  max-width: 280px;
}

.tooltip-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.tooltip-row {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
