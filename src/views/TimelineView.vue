<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore, useProjectStore, useMemberStore, usePlanningStore, useUserStore } from '@/stores'
import { TASK_STAGES } from '@/types'
import type { Task, TaskPhase } from '@/types'
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

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const planningStore = usePlanningStore()
const userStore = useUserStore()

const tasks = computed(() => taskStore.tasks)
const projects = computed(() => projectStore.projects)
const members = computed(() => memberStore.members)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)

const GRID_SLOT_WIDTH = 12.5

const selectedProjectId = ref<string>('')
const filterStage = ref<string>('')
const filterPriority = ref<string>('')

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

// Sync projectId from route
watchEffect(() => {
  const projectId = route.params.projectId as string | undefined
  if (projectId && projectStore.currentProjectId !== projectId) {
    projectStore.setCurrentProject(projectId)
  }
  selectedProjectId.value = projectId || ''
})

// Sync planningId from route
watchEffect(() => {
  const planningId = route.query.planning as string | undefined
  if (planningId && projectStore.selectedPlanningId !== planningId) {
    projectStore.setSelectedPlanning(planningId)
  }
})

// Get selected planning
const selectedPlanning = computed(() => {
  if (!selectedPlanningId.value) return null
  return planningStore.getPlanningById(selectedPlanningId.value)
})

// 1.1 timelineStart from Planning.createdAt
const timelineStart = computed(() => {
  if (selectedPlanning.value?.createdAt) {
    return new Date(selectedPlanning.value.createdAt)
  }
  return new Date()
})

// 1.2 timelineEnd from Planning.deadline, fallback +14 days
const timelineEnd = computed(() => {
  if (selectedPlanning.value?.deadline) {
    return new Date(selectedPlanning.value.deadline)
  }
  // fallback: createdAt + 14 days
  const start = timelineStart.value
  return new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
})

// 1.3 daySlots: array of { date, slots: [0,1,2,3] }
interface DaySlot {
  date: Date
  dateStr: string
  dayIndex: number
}

type ScheduledTaskPhase = TaskPhase & {
  startTime: string
  endTime: string
}

type PhaseHealthStatus = 'not-started' | 'on-track' | 'behind' | 'overdue' | 'completed'

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

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const workdayConfig = computed(() => ({
  nonWorkdays: projectStore.currentProject?.nonWorkdays || [],
  extraWorkdays: projectStore.currentProject?.extraWorkdays || []
}))

const isScheduledPhase = (phase: TaskPhase): phase is ScheduledTaskPhase => {
  return Boolean(phase.startTime && phase.endTime)
}

const isPhaseInVisibleRange = (phase: ScheduledTaskPhase): boolean => {
  return getWorkSlotGridRange(phase.startTime, phase.endTime, workSlots.value) !== null
}

const getTaskPhaseBars = (task: Task): ScheduledTaskPhase[] => {
  return (task.phases || [])
    .filter(isScheduledPhase)
    .filter(isPhaseInVisibleRange)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

const getTaskPhaseRowCount = (task: Task): number => {
  return Math.max(getTaskPhaseBars(task).length, 1)
}

// Filtered tasks
const filteredTasks = computed(() => {
  let result = tasks.value.filter(t => taskStore.isTaskItem(t))

  if (selectedProjectId.value) {
    result = result.filter(t => t.projectId === selectedProjectId.value)
  }

  if (selectedPlanningId.value) {
    result = result.filter(t => t.planningId === selectedPlanningId.value)
  }

  if (filterStage.value) {
    result = result.filter(t => taskStore.getTaskStageValue(t) === filterStage.value)
  }

  if (filterPriority.value) {
    result = result.filter(t => t.priority === filterPriority.value)
  }

  // Filter out tasks with no scheduled phases in the visible time range.
  result = result.filter(t => getTaskPhaseBars(t).length > 0)

  return result
})

// Get bar style for a participant
const getBarStyle = (startTime: string | null, endTime: string | null) => {
  const range = getWorkSlotGridRange(startTime, endTime, workSlots.value)
  if (!range) return { display: 'none' }
  return {
    gridColumn: `${range.start} / ${range.end}`
  }
}

const getMemberName = (memberId: string): string => {
  if (!memberId) return '待分配'
  const member = members.value.find(m => m.id === memberId)
  return member?.name || '未知'
}


const getPhaseProgressPercent = (phase: TaskPhase): number => {
  return Math.round(clamp(phase.progress || 0, 0, 100))
}

const getExpectedProgress = (phase: ScheduledTaskPhase, nowMs = Date.now()): number => {
  const start = new Date(phase.startTime)
  const end = new Date(phase.endTime)
  const now = new Date(nowMs)
  const workDuration = getEffectiveWorkingMinutes(start, end, workdayConfig.value)

  if (workDuration <= 0) {
    return now.getTime() > end.getTime() && isWorkday(now) ? 100 : 0
  }

  const elapsedWorkDuration = getEffectiveWorkingMinutes(start, now, workdayConfig.value)
  return clamp((elapsedWorkDuration / workDuration) * 100, 0, 100)
}

const getPhaseHealthStatus = (phase: ScheduledTaskPhase): PhaseHealthStatus => {
  const progress = getPhaseProgressPercent(phase)
  const now = Date.now()
  const start = new Date(phase.startTime)
  const end = new Date(phase.endTime)
  const nowDate = new Date(now)
  const workDuration = getEffectiveWorkingMinutes(start, end, workdayConfig.value)
  const elapsedWorkDuration = getEffectiveWorkingMinutes(start, nowDate, workdayConfig.value)

  if (progress >= 100) return 'completed'
  if (now < start.getTime()) return progress > 0 ? 'on-track' : 'not-started'
  if (workDuration <= 0 && now > end.getTime() && isWorkday(nowDate)) return 'overdue'
  if (workDuration > 0 && elapsedWorkDuration > workDuration) return 'overdue'
  return progress >= getExpectedProgress(phase, now) ? 'on-track' : 'behind'
}

const phaseProgressColors: Record<PhaseHealthStatus, string> = {
  'not-started': '#f59e0b',
  'on-track': '#22c55e',
  behind: '#dc2626',
  overdue: '#dc2626',
  completed: '#16a34a'
}

const phaseProgressBackgroundColors: Record<PhaseHealthStatus, string> = {
  'not-started': '#fef3c7',
  'on-track': '#dcfce7',
  behind: '#fee2e2',
  overdue: '#fee2e2',
  completed: '#dcfce7'
}

const phaseStatusLabels: Record<PhaseHealthStatus, string> = {
  'not-started': '未开始',
  'on-track': '正常',
  behind: '落后',
  overdue: '超时',
  completed: '已完成'
}

const healthLegendItems = [
  { status: 'not-started' as PhaseHealthStatus, label: '未开始' },
  { status: 'on-track' as PhaseHealthStatus, label: '正常/超前/完成' },
  { status: 'behind' as PhaseHealthStatus, label: '落后/超时' }
]

const getPhaseProgressColor = (phase: ScheduledTaskPhase): string => {
  return phaseProgressColors[getPhaseHealthStatus(phase)]
}

const getPhaseProgressBackgroundColor = (phase: ScheduledTaskPhase): string => {
  return phaseProgressBackgroundColors[getPhaseHealthStatus(phase)]
}

const getPhaseAssigneeName = (phase: ScheduledTaskPhase): string => {
  return phase.assigneeId ? getMemberName(phase.assigneeId) : getMemberName('')
}

const getPhaseBarStyle = (phase: ScheduledTaskPhase, index: number) => {
  const progress = getPhaseProgressPercent(phase)
  return {
    ...getBarStyle(phase.startTime, phase.endTime),
    gridRow: `${index + 1}`,
    '--phase-progress-color': getPhaseProgressColor(phase),
    '--phase-progress-bg': getPhaseProgressBackgroundColor(phase),
    '--phase-progress': `${progress}%`
  }
}

const formatPhaseDateTime = (value: string): string => {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getPhaseTooltip = (task: Task, phase: ScheduledTaskPhase): string => {
  const status = getPhaseHealthStatus(phase)
  const duration = getEffectiveWorkingMinutes(new Date(phase.startTime), new Date(phase.endTime), workdayConfig.value)
  return [
    `任务：${task.title}`,
    `阶段：${phase.name}`,
    `执行者：${getPhaseAssigneeName(phase)}`,
    `时间：${formatPhaseDateTime(phase.startTime)} - ${formatPhaseDateTime(phase.endTime)}`,
    `有效工时：${formatWorkingDuration(duration)}`,
    `进度：${getPhaseProgressPercent(phase)}%`,
    `状态：${phaseStatusLabels[status]}`
  ].join('\n')
}

const getTaskStageName = (task: typeof tasks.value[0]): string => {
  return taskStore.getTaskStageLabel(task)
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高'
}

// Workday logic
const canEditWorkday = computed(() => userStore.isAdmin || userStore.currentUser?.role === 'pm')

const formatDateKey = (date: Date): string => {
  return formatScheduleDateKey(date)
}

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
</script>

<template>
  <div class="page timeline-page">
    <div class="page-header">
      <div class="header-content">
        <h2 v-if="selectedPlanning">{{ selectedPlanning.name }} - 时间轴</h2>
        <h2 v-else>时间轴</h2>
      </div>
      <div class="header-actions">
        <select v-model="filterStage" class="input select">
          <option value="">全部阶段</option>
          <option v-for="stage in TASK_STAGES" :key="stage.value" :value="stage.value">
            {{ stage.label }}
          </option>
        </select>
        <select v-model="filterPriority" class="input select">
          <option value="">全部优先级</option>
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
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

    <div v-if="filteredTasks.length === 0" class="empty-state">
      <p>暂无任务数据</p>
    </div>

    <div v-else class="timeline-wrapper">
      <div class="timeline-scroll-body">
        <!-- Header row (sticky top) -->
        <div class="timeline-row timeline-row--header">
          <div class="task-info task-info--header">任务</div>
          <div class="timeline-grid-header" :style="{ gridTemplateColumns: `repeat(${visibleTotalSlots}, ${GRID_SLOT_WIDTH}px)` }">
            <template v-for="(day, di) in visibleDaySlots" :key="day.dayIndex">
              <div
                class="date-label"
                :class="{
                  'non-workday': !isWorkday(day.date),
                  'can-edit': canEditWorkday
                }"
                :style="{ gridColumn: `${di * WORK_SLOTS_PER_DAY + 1} / ${(di + 1) * WORK_SLOTS_PER_DAY + 1}` }"
                @click="canEditWorkday ? toggleWorkday(day.date) : undefined"
              >
                {{ day.dateStr }}
                <span v-if="!isWorkday(day.date)" class="rest-badge">休</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Task rows -->
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="timeline-row"
        >
          <div class="task-info">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <span class="task-stage" :class="`stage-${taskStore.getTaskStageValue(task)}`">{{ getTaskStageName(task) }}</span>
            </div>
          </div>

          <div
            class="task-grid"
            :style="{
              gridTemplateColumns: `repeat(${visibleTotalSlots}, ${GRID_SLOT_WIDTH}px)`,
              gridTemplateRows: `repeat(${getTaskPhaseRowCount(task)}, 36px)`
            }"
          >
            <div
              v-for="(day, di) in visibleDaySlots"
              :key="day.dayIndex"
              class="grid-cell day-start"
              :class="{ 'non-workday-cell': !isWorkday(day.date) }"
              :style="{
                gridColumn: `${di * WORK_SLOTS_PER_DAY + 1} / ${(di + 1) * WORK_SLOTS_PER_DAY + 1}`,
                gridRow: `1 / ${getTaskPhaseRowCount(task) + 1}`
              }"
            ></div>

            <div
              v-for="(phase, pIndex) in getTaskPhaseBars(task)"
              :key="phase.id"
              class="phase-bar"
              :style="getPhaseBarStyle(phase, pIndex)"
              :title="getPhaseTooltip(task, phase)"
              @click="openEditTaskModal(task)"
            >
              <span class="phase-progress-fill"></span>
              <span class="phase-assignee-dot"></span>
              <span class="bar-label">
                <span class="phase-assignee">{{ getPhaseAssigneeName(phase) }}</span>
                <span class="phase-name">{{ phase.name }}</span>
                <span class="phase-progress-text">{{ getPhaseProgressPercent(phase) }}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="timeline-legend">
      <div
        v-for="item in healthLegendItems"
        :key="item.status"
        class="legend-item"
      >
        <span class="legend-color" :style="{ backgroundColor: phaseProgressColors[item.status] }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>

    <TaskModal
      :is-open="isModalOpen"
      :task="selectedTask"
      :project-id="projectStore.currentProjectId || ''"
      :initial-planning-id="selectedPlanningId"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.timeline-page {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions .select {
  min-width: 140px;
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

/* Timeline table layout */
.timeline-wrapper {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Single scroll container for header + body */
.timeline-scroll-body {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
}

/* All rows */
.timeline-row {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  min-width: fit-content;
}

.timeline-row:last-child {
  border-bottom: none;
}

/* Header row - sticky top */
.timeline-row--header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg-secondary);
}

.timeline-row--header .timeline-grid-header {
  display: grid;
  flex: 1;
  min-width: fit-content;
}

/* Left column - fixed */
.task-info {
  width: 200px;
  min-width: 200px;
  max-width: 200px;
  padding: 10px 16px;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  position: sticky;
  left: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.task-info--header {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  position: sticky;
  left: 0;
  z-index: 15;
  padding: 12px 16px;
}

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
  color: var(--color-text-tertiary);
}

.date-label.can-edit {
  cursor: pointer;
}

.date-label.can-edit:hover {
  background-color: var(--color-bg-tertiary);
}

.date-label.non-workday {
  background-color: #e5e7eb;
  color: #6b7280;
}

.rest-badge {
  display: inline-block;
  font-size: 10px;
  color: #ef4444;
  font-weight: 600;
  margin-left: 2px;
}

.non-workday-cell {
  background-color: #e5e7eb;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.task-stage {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  width: fit-content;
}

.task-stage.stage-filed { background-color: #e5e7eb; color: #6b7280; }
.task-stage.stage-designing { background-color: #dbeafe; color: #2563eb; }
.task-stage.stage-initial { background-color: #fef3c7; color: #d97706; }
.task-stage.stage-preliminary { background-color: #d1fae5; color: #059669; }
.task-stage.stage-final { background-color: #e0e7ff; color: #4f46e5; }
.task-stage.stage-finalAcceptance { background-color: #fce7f3; color: #db2777; }
.task-stage.stage-completed { background-color: #d1fae5; color: #059669; }

/* Grid area */
.task-grid {
  display: grid;
  min-width: fit-content;
  min-height: 48px;
  position: relative;
}

.grid-cell {
  border-right: 1px solid var(--color-border);
  opacity: 0.3;
  min-height: 100%;
}

.grid-cell.day-start {
  border-left: 2px solid var(--color-border);
}

/* Phase bars */
.phase-bar {
  position: relative;
  height: 26px;
  margin: 5px 2px;
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--phase-progress-color);
  background-color: var(--phase-progress-bg);
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 10px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  z-index: 2;
}

.phase-bar:hover {
  opacity: 0.8;
}

.phase-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--phase-progress);
  min-width: 0;
  background-color: var(--phase-progress-color);
  border-radius: var(--radius-sm);
  pointer-events: none;
}

.phase-assignee-dot {
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 999px;
  background-color: var(--phase-progress-color);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.bar-label {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.phase-assignee,
.phase-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.phase-assignee {
  max-width: 72px;
  flex-shrink: 0;
}

.phase-name {
  min-width: 0;
}

.phase-progress-text {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

/* Legend */
.timeline-legend {
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
</style>
