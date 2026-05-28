<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore, useProjectStore, useMemberStore, usePlanningStore, useUserStore } from '@/stores'
import { ROLES, TASK_STAGES } from '@/types'
import type { RoleType } from '@/types'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const planningStore = usePlanningStore()
const userStore = useUserStore()

const tasks = computed(() => taskStore.tasks)
const members = computed(() => memberStore.members)
const plannings = computed(() => planningStore.plannings)
const projects = computed(() => projectStore.projects)

const GRID_SLOT_WIDTH = 100
const MEMBER_INFO_WIDTH = 180
const MEMBER_INFO_PADDING_X = 16
const MEMBER_INFO_TOTAL_WIDTH = MEMBER_INFO_WIDTH + MEMBER_INFO_PADDING_X * 2 + 1

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
      dateStr: `${current.getMonth() + 1}/${current.getDate()}（${'日一二三四五六'[current.getDay()]}）`,
      dayIndex
    })
    current.setDate(current.getDate() + 1)
    dayIndex++
  }
  return days
})

// All tasks (global view, no project/planning filter)
const allTasks = computed(() => tasks.value)

// Group tasks by memberId
interface MemberTaskItem {
  task: typeof tasks.value[0]
  participant: NonNullable<typeof tasks.value[0]['participants'][0]>
  rowIndex: number
  zIndex: number
  isShadowed: boolean
}

const assignRowIndices = (items: Array<Omit<MemberTaskItem, 'rowIndex' | 'zIndex' | 'isShadowed'>>): MemberTaskItem[] => {
  const sortedItems = [...items].sort((a, b) => {
    const aStart = a.participant.startTime ? new Date(a.participant.startTime).getTime() : Number.MAX_SAFE_INTEGER
    const bStart = b.participant.startTime ? new Date(b.participant.startTime).getTime() : Number.MAX_SAFE_INTEGER
    return aStart - bStart
  })

  return sortedItems.map((item, index) => {
    let isShadowed = false
    for (let i = 0; i < index; i++) {
      const earlier = sortedItems[i]
      if (rangesOverlap(
        { start: item.participant.startTime, end: item.participant.endTime },
        { start: earlier.participant.startTime, end: earlier.participant.endTime }
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
    for (const participant of task.participants) {
      if (!participant.memberId || !participant.startTime) continue
      const taskStart = new Date(participant.startTime).getTime()
      const taskEnd = participant.endTime ? new Date(participant.endTime).getTime() : taskStart + 24 * 60 * 60 * 1000
      if (taskEnd < rangeStart || taskStart >= rangeEnd) continue
      if (!memberMap.has(participant.memberId)) {
        memberMap.set(participant.memberId, [])
      }
      memberMap.get(participant.memberId)!.push({ task, participant })
    }
  }

  // Build member list (only current project participants)
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
    map.set(p.id, PLANNING_COLORS[index % PLANNING_COLORS.length])
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

// Slot index calculation
const getSlotIndex = (timestamp: string): number => {
  const date = new Date(timestamp)
  const start = timelineStart.value
  const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const daysDiff = Math.floor((currentDay - startOfDay) / (24 * 60 * 60 * 1000))
  const hourOfDay = date.getHours()
  const slotInDay = Math.floor(hourOfDay / 12)
  return daysDiff * 2 + slotInDay
}

// Clamp to nearest visible day
const clampToVisible = (dayIndex: number, direction: 'forward' | 'backward'): number | undefined => {
  const map = dayIndexToVisibleCol.value!
  if (map.has(dayIndex)) return map.get(dayIndex)
  const totalDays = daySlots.value.length
  if (direction === 'forward') {
    for (let d = dayIndex + 1; d < totalDays; d++) {
      if (map.has(d)) return map.get(d)
    }
  } else {
    for (let d = dayIndex - 1; d >= 0; d--) {
      if (map.has(d)) return map.get(d)
    }
  }
  return undefined
}

// Bar style for a task participant
const getBarStyle = (item: MemberTaskItem) => {
  const startTime = item.participant.startTime
  const endTime = item.participant.endTime
  if (!startTime) return { display: 'none' }

  const startSlot = getSlotIndex(startTime)
  const endSlot = endTime ? getSlotIndex(endTime) + 1 : startSlot + 1

  if (dayIndexToVisibleCol.value) {
    const startDay = Math.floor(startSlot / 2)
    const startHalf = startSlot % 2
    const endDay = Math.floor((endSlot - 1) / 2)
    const endHalf = (endSlot - 1) % 2
    const visStartDay = clampToVisible(startDay, 'forward')
    const visEndDay = clampToVisible(endDay, 'backward')
    if (visStartDay === undefined || visEndDay === undefined) return { display: 'none' }
    return {
      gridColumn: `${visStartDay * 2 + startHalf + 1} / ${visEndDay * 2 + endHalf + 2}`,
      gridRow: `${item.rowIndex + 1}`
    }
  }

  return {
    gridColumn: `${startSlot + 1} / ${endSlot + 1}`,
    gridRow: `${item.rowIndex + 1}`
  }
}

// Overlap detection: check if two time ranges overlap
const rangesOverlap = (a: { start: string | null, end: string | null }, b: { start: string | null, end: string | null }): boolean => {
  if (!a.start || !b.start) return false
  const aStart = new Date(a.start).getTime()
  const aEnd = a.end ? new Date(a.end).getTime() : aStart + 12 * 60 * 60 * 1000
  const bStart = new Date(b.start).getTime()
  const bEnd = b.end ? new Date(b.end).getTime() : bStart + 12 * 60 * 60 * 1000
  return aStart < bEnd && bStart < aEnd
}

// Tooltip
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<{ taskName: string, planningName: string, stage: string, priority: string } | null>(null)

const priorityLabels: Record<string, string> = { low: '低', medium: '中', high: '高' }
const getStageName = (stage: string): string => {
  const s = TASK_STAGES.find(t => t.value === stage)
  return s?.label || stage
}

const showTooltip = (e: MouseEvent, item: MemberTaskItem) => {
  tooltipData.value = {
    taskName: item.task.title,
    planningName: getPlanningName(item.task.planningId, item.task.projectId),
    stage: getStageName(item.task.stage),
    priority: priorityLabels[item.task.priority] || item.task.priority
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

const visibleTotalSlots = computed(() => visibleDaySlots.value.length * 2)

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

// Active plannings for legend (with project info)
const activePlannings = computed(() => {
  const seen = new Set<string>()
  const result: Array<{ id: string, name: string, projectId: string }> = []
  for (const task of allTasks.value) {
    if (!task.planningId) continue
    const key = `${task.projectId}:${task.planningId}`
    if (seen.has(key)) continue
    seen.add(key)
    const planning = plannings.value.find(p => p.id === task.planningId)
    if (planning) {
      result.push({ id: planning.id, name: `${getProjectName(task.projectId)} - ${planning.name}`, projectId: task.projectId })
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

    <div v-if="memberScheduleData.length === 0" class="empty-state">
      <p>暂无任务数据</p>
    </div>

    <div v-else class="schedule-wrapper">
      <div class="schedule-scroll-body">
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
            <template v-for="(day, vi) in visibleDaySlots" :key="day.dayIndex">
              <div
                class="date-label"
                :class="{ 'non-workday': !isWorkday(day.date), 'can-edit': canEditWorkday }"
                :style="{ gridColumn: `${vi * 2 + 1} / ${vi * 2 + 3}` }"
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
              v-for="(day, vi) in visibleDaySlots"
              :key="day.dayIndex"
              class="grid-cell day-start"
              :class="{ 'non-workday-cell': !isWorkday(day.date) }"
              :style="{ gridColumn: `${vi * 2 + 1} / ${vi * 2 + 3}` }"
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
            >
              <span class="bar-label">{{ item.task.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

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
        <div class="tooltip-row">优先级：{{ tooltipData.priority }}</div>
      </div>
    </Teleport>
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
  padding: 12px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-right: 2px solid var(--color-border);
  position: relative;
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
