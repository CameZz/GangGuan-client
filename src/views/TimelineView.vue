<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore, useProjectStore, useMemberStore, usePlanningStore, useUserStore } from '@/stores'
import { ROLES, TASK_STAGES } from '@/types'
import type { RoleType, TaskPriority } from '@/types'

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

const selectedProjectId = ref<string>('')
const filterStage = ref<string>('')
const filterPriority = ref<string>('')

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
      dateStr: `${current.getMonth() + 1}/${current.getDate()}（${'日一二三四五六'[current.getDay()]}）`,
      dayIndex
    })
    current.setDate(current.getDate() + 1)
    dayIndex++
  }
  return days
})

// Filtered tasks
const filteredTasks = computed(() => {
  let result = tasks.value

  if (selectedProjectId.value) {
    result = result.filter(t => t.projectId === selectedProjectId.value)
  }

  if (selectedPlanningId.value) {
    result = result.filter(t => t.planningId === selectedPlanningId.value)
  }

  if (filterStage.value) {
    result = result.filter(t => t.stage === filterStage.value)
  }

  if (filterPriority.value) {
    result = result.filter(t => t.priority === filterPriority.value)
  }

  return result
})

// Calculate which slot a timestamp falls into (0-based)
const getSlotIndex = (timestamp: string): number => {
  const time = new Date(timestamp).getTime()
  const start = timelineStart.value.getTime()
  const daysDiff = (time - start) / (24 * 60 * 60 * 1000)
  const dayIndex = Math.floor(daysDiff)
  const hourOfDay = new Date(timestamp).getHours()
  const slotInDay = Math.floor(hourOfDay / 6) // 0-3
  return dayIndex * 4 + slotInDay
}

// Get bar style for a participant
const getBarStyle = (startTime: string | null, endTime: string | null) => {
  if (!startTime) return { display: 'none' }

  const startSlot = getSlotIndex(startTime)
  const endSlot = endTime ? getSlotIndex(endTime) + 1 : startSlot + 1

  if (dayIndexToVisibleCol.value) {
    const startDay = Math.floor(startSlot / 4)
    const startSub = startSlot % 4
    const endDay = Math.floor((endSlot - 1) / 4)
    const endSub = (endSlot - 1) % 4
    const visStartDay = dayIndexToVisibleCol.value.get(startDay)
    const visEndDay = dayIndexToVisibleCol.value.get(endDay)
    if (visStartDay === undefined || visEndDay === undefined) return { display: 'none' }
    return {
      gridColumn: `${visStartDay * 4 + startSub + 1} / ${visEndDay * 4 + endSub + 2}`
    }
  }

  return {
    gridColumn: `${startSlot + 1} / ${endSlot + 1}`
  }
}

const roleColors: Record<RoleType, string> = {
  pm: '#6366f1',
  planner: '#8b5cf6',
  artist: '#ec4899',
  ui: '#f43f5e',
  server: '#14b8a6',
  client: '#22c55e',
  devops: '#f59e0b',
  animator: '#eab308',
  sound: '#06b6d4',
  tester: '#3b82f6'
}

const getRoleColor = (roleType: RoleType): string => {
  return roleColors[roleType] || '#6b7280'
}

const getRoleName = (roleType: RoleType): string => {
  const role = ROLES.find(r => r.type === roleType)
  return role?.name || roleType
}

const getMemberName = (memberId: string): string => {
  if (!memberId) return '待分配'
  const member = members.value.find(m => m.id === memberId)
  return member?.name || '未知'
}

const getStageName = (stage: string): string => {
  const s = TASK_STAGES.find(t => t.value === stage)
  return s?.label || stage
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高'
}

// Workday logic
const canEditWorkday = computed(() => userStore.isAdmin || userStore.currentUser?.role === 'pm')

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const isWorkday = (date: Date): boolean => {
  const key = formatDateKey(date)
  const project = projectStore.currentProject
  if (project?.nonWorkdays?.includes(key)) return false
  if (project?.extraWorkdays?.includes(key)) return true
  const day = date.getDay()
  return day >= 1 && day <= 5
}

const toggleWorkday = (date: Date) => {
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

  projectStore.updateProject(project.id, { nonWorkdays, extraWorkdays })
}

// Collapse rest days
const collapseRestDays = ref(false)

const visibleDaySlots = computed(() => {
  if (!collapseRestDays.value) return daySlots.value
  return daySlots.value.filter(day => isWorkday(day.date))
})

const visibleTotalSlots = computed(() => visibleDaySlots.value.length * 4)

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
          <div class="timeline-grid-header" :style="{ gridTemplateColumns: `repeat(${visibleTotalSlots}, 48px)` }">
            <template v-for="(day, vi) in visibleDaySlots" :key="day.dayIndex">
              <div
                class="date-label"
                :class="{
                  'non-workday': !isWorkday(day.date),
                  'can-edit': canEditWorkday
                }"
                :style="{ gridColumn: `${vi * 4 + 1} / ${vi * 4 + 5}` }"
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
              <span class="task-stage" :class="`stage-${task.stage}`">{{ getStageName(task.stage) }}</span>
            </div>
          </div>

          <div class="task-grid" :style="{ gridTemplateColumns: `repeat(${visibleTotalSlots}, 48px)` }">
            <div
              v-for="(day, vi) in visibleDaySlots"
              :key="day.dayIndex"
              class="grid-cell day-start"
              :class="{ 'non-workday-cell': !isWorkday(day.date) }"
              :style="{ gridColumn: `${vi * 4 + 1} / ${vi * 4 + 5}` }"
            ></div>

            <div
              v-for="(participant, pIndex) in task.participants"
              :key="pIndex"
              class="participant-bar"
              :style="{
                ...getBarStyle(participant.startTime, participant.endTime),
                backgroundColor: getRoleColor(participant.roleType)
              }"
              :title="`${getRoleName(participant.roleType)}: ${getMemberName(participant.memberId)}`"
            >
              <span class="bar-label">{{ getRoleName(participant.roleType) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="timeline-legend">
      <div
        v-for="role in ROLES"
        :key="role.type"
        class="legend-item"
      >
        <span class="legend-color" :style="{ backgroundColor: getRoleColor(role.type) }"></span>
        <span class="legend-label">{{ role.name }}</span>
      </div>
    </div>
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
  padding: 12px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-right: 2px solid var(--color-border);
  position: relative;
}

.date-label.can-edit {
  cursor: pointer;
}

.date-label.can-edit:hover {
  background-color: var(--color-bg-tertiary);
}

.date-label.non-workday {
  background-color: #f3f4f6;
  color: #9ca3af;
}

.rest-badge {
  display: inline-block;
  font-size: 10px;
  color: #ef4444;
  font-weight: 600;
  margin-left: 2px;
}

.non-workday-cell {
  background-color: #f9fafb;
  opacity: 0.5;
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
  position: relative;
}

.grid-cell {
  border-right: 1px solid var(--color-border);
  opacity: 0.3;
  min-height: 48px;
}

.grid-cell.day-start {
  border-left: 2px solid var(--color-border);
}

/* Participant bars */
.participant-bar {
  position: relative;
  height: 24px;
  margin: 12px 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 10px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  z-index: 2;
}

.participant-bar:hover {
  opacity: 0.8;
}

.bar-label {
  font-weight: 500;
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
