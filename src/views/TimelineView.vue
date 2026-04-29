<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore, useProjectStore, useMemberStore } from '@/stores'
import { ROLES, TASK_STAGES } from '@/types'
import type { RoleType } from '@/types'

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()

const tasks = computed(() => taskStore.tasks)
const projects = computed(() => projectStore.projects)
const members = computed(() => memberStore.members)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)

const selectedProjectId = ref<string>('')

// Sync projectId from route (only when it changes)
watchEffect(() => {
  const projectId = route.params.projectId as string | undefined
  if (projectId && projectStore.currentProjectId !== projectId) {
    projectStore.setCurrentProject(projectId)
  }
  selectedProjectId.value = projectId || ''
})

// Sync planningId from route (only when it changes)
watchEffect(() => {
  const planningId = route.query.planning as string | undefined
  if (planningId && projectStore.selectedPlanningId !== planningId) {
    projectStore.setSelectedPlanning(planningId)
  }
})

const filteredTasks = computed(() => {
  let result = tasks.value

  if (selectedProjectId.value) {
    result = result.filter(t => t.projectId === selectedProjectId.value)
  }

  if (selectedPlanningId.value) {
    result = result.filter(t => t.planningId === selectedPlanningId.value)
  }

  return result
})

const timelineStart = computed(() => {
  const dates = filteredTasks.value.flatMap(t =>
    t.participants.map(p => p.startTime).filter(Boolean)
  )
  if (dates.length === 0) {
    return new Date()
  }
  return new Date(Math.min(...dates.map(d => new Date(d!).getTime())))
})

const timelineEnd = computed(() => {
  const dates = filteredTasks.value.flatMap(t =>
    t.participants.map(p => p.endTime).filter(Boolean)
  )
  if (dates.length === 0) {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
  return new Date(Math.max(...dates.map(d => new Date(d!).getTime())))
})

const dayWidth = 40

const timelineWidth = computed(() => {
  const days = (timelineEnd.value.getTime() - timelineStart.value.getTime()) / (24 * 60 * 60 * 1000)
  return Math.max(days * dayWidth, 800)
})

const getParticipantBarStyle = (startTime: string | null, endTime: string | null) => {
  if (!startTime) return { display: 'none' }

  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()

  const left = (start - timelineStart.value.getTime()) / (24 * 60 * 60 * 1000) * dayWidth
  const width = (end - start) / (24 * 60 * 60 * 1000) * dayWidth

  return {
    left: `${left}px`,
    width: `${Math.max(width, 20)}px`
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

const getProjectName = (projectId: string): string => {
  const project = projects.value.find(p => p.id === projectId)
  return project?.name || '未知项目'
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="page timeline-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">时间轴视图</h1>
        <p class="page-subtitle">查看任务各参与角色的时间安排</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedProjectId" class="input select">
          <option value="">全部项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="timeline-container">
      <div class="timeline-header">
        <div class="timeline-labels">
          <div class="timeline-label-header">任务</div>
          <div
            v-for="day in Math.ceil(timelineWidth / dayWidth / 10)"
            :key="day"
            class="timeline-day-label"
          >
            {{ formatDate(new Date(timelineStart.getTime() + (day - 1) * 10 * 24 * 60 * 60 * 1000)) }}
          </div>
        </div>
      </div>

      <div class="timeline-body" :style="{ width: `${timelineWidth + 300}px` }">
        <div class="timeline-grid">
          <div
            v-for="day in Math.ceil(timelineWidth / dayWidth)"
            :key="day"
            class="timeline-grid-line"
            :style="{ left: `${(day - 1) * dayWidth}px` }"
          ></div>
        </div>

        <div class="timeline-tasks">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="timeline-task"
          >
            <div class="task-info">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-meta">
                <span class="task-project">{{ getProjectName(task.projectId) }}</span>
                <span class="task-stage" :class="`stage-${task.stage}`">{{ getStageName(task.stage) }}</span>
              </div>
            </div>
            <div class="task-timeline">
              <div class="task-bars">
                <div
                  v-for="(participant, index) in task.participants"
                  :key="index"
                  class="participant-bar"
                  :style="{
                    ...getParticipantBarStyle(participant.startTime, participant.endTime),
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
      </div>

      <div v-if="filteredTasks.length === 0" class="empty-state">
        <p>暂无任务数据</p>
      </div>
    </div>

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
  overflow-x: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions .select {
  min-width: 200px;
}

.timeline-container {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.timeline-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.timeline-labels {
  display: flex;
  padding-left: 200px;
}

.timeline-label-header {
  position: sticky;
  left: 0;
  width: 200px;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
}

.timeline-day-label {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 12px 0;
  border-right: 1px solid var(--color-border);
  min-width: 400px;
}

.timeline-body {
  position: relative;
  min-height: 200px;
}

.timeline-grid {
  position: absolute;
  top: 0;
  left: 200px;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.timeline-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: var(--color-border);
  opacity: 0.5;
}

.timeline-tasks {
  position: relative;
}

.timeline-task {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  min-height: 80px;
}

.timeline-task:last-child {
  border-bottom: none;
}

.task-info {
  width: 200px;
  padding: 12px 16px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  position: sticky;
  left: 0;
  z-index: 5;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-project {
  font-size: 11px;
  color: var(--color-text-muted);
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

.task-timeline {
  flex: 1;
  position: relative;
  padding: 12px 0;
  min-width: 800px;
}

.task-bars {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-bar {
  position: absolute;
  height: 20px;
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
}

.participant-bar:hover {
  opacity: 0.8;
}

.bar-label {
  font-weight: 500;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--color-text-muted);
}

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
