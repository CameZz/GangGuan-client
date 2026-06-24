<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { useMemberStore, useTaskStore } from '@/stores'
import MemberAvatar from '@/components/member/MemberAvatar.vue'

const props = withDefaults(defineProps<{
  task: Task
  draggable?: boolean
}>(), {
  draggable: true
})

const emit = defineEmits<{
  click: []
  dragstart: [task: Task]
}>()

const memberStore = useMemberStore()
const taskStore = useTaskStore()

const isRequirement = computed(() => taskStore.isRequirement(props.task))

const assignee = computed(() => {
  if (!props.task.assigneeId) return null
  return memberStore.getMemberById(props.task.assigneeId)
})

const priorityLabel = computed(() => {
  const labels: Record<string, string> = { low: '低', medium: '中', high: '高' }
  return labels[props.task.priority] || props.task.priority
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成', 'abandoned': '已废弃' }
  return labels[props.task.status] || props.task.status
})

const priorityClass = computed(() => `badge-${props.task.priority}`)
const statusClass = computed(() => `badge-${props.task.status}`)

const stageLabel = computed(() => {
  return taskStore.getTaskStageLabel(props.task)
})

const taskPhaseProgress = computed(() => taskStore.getTaskPhaseProgress(props.task.phases))

const formattedDueDate = computed(() => {
  if (isRequirement.value) return null
  if (!props.task.dueDate) return null
  const date = new Date(props.task.dueDate)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})

const isOverdue = computed(() => {
  if (!props.task.dueDate || props.task.status === 'done' || props.task.status === 'abandoned') return false
  return new Date(props.task.dueDate) < new Date()
})

const requirementProgress = computed(() => {
  if (!isRequirement.value) return null
  return taskStore.getRequirementProgress(props.task.id)
})

const progressText = computed(() => {
  if (!requirementProgress.value) return ''
  if (requirementProgress.value.total === 0) return '待拆分'
  return `${requirementProgress.value.done}/${requirementProgress.value.total}`
})

function handleDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.task.id)
  emit('dragstart', props.task)
}
</script>

<template>
  <div
    class="task-card"
    :class="{ 'task-card--requirement': isRequirement }"
    :draggable="props.draggable"
    @click="emit('click')"
    @dragstart="handleDragStart"
  >
    <div v-if="isRequirement" class="task-header">
      <span class="item-type requirement">需求单</span>
      <span class="task-progress">{{ progressText }}</span>
    </div>
    <div class="task-title-line">
      <div class="task-title-main">
        <h4 class="task-title">{{ task.title }}</h4>
        <span v-if="!isRequirement" class="item-type">任务单</span>
      </div>
      <span v-if="!isRequirement" class="task-stage task-stage-title">{{ stageLabel }}</span>
    </div>
    <div v-if="isRequirement" class="requirement-summary">
      拆分进度：{{ progressText }}
    </div>
    <div v-else-if="taskPhaseProgress.total > 0" class="task-phase-progress">
      <div class="task-phase-progress-bar">
        <div class="task-phase-progress-fill" :style="{ width: `${taskPhaseProgress.percent}%` }"></div>
      </div>
      <span>{{ taskPhaseProgress.done }}/{{ taskPhaseProgress.total }}</span>
    </div>
    <div class="task-footer">
      <span class="badge" :class="priorityClass">{{ priorityLabel }}</span>
      <div v-if="formattedDueDate" class="task-due" :class="{ overdue: isOverdue }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{{ formattedDueDate }}</span>
      </div>
      <MemberAvatar v-if="!isRequirement" :member="assignee" size="sm" show-name />
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.task-card--requirement {
  border-color: #94a3b8;
  background-color: #f8fafc;
}

.task-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.task-card:active {
  transform: scale(0.98);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-type {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background-color: #e0f2fe;
  color: #0369a1;
  font-weight: 600;
}

.item-type.requirement {
  background-color: #e2e8f0;
  color: #334155;
}

.task-stage {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.task-stage-title {
  flex-shrink: 0;
}

.task-progress {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.task-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.task-title-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title {
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.requirement-summary {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.task-phase-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.task-phase-progress-bar {
  flex: 1;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-tertiary);
}

.task-phase-progress-fill {
  height: 100%;
  border-radius: inherit;
  background-color: var(--color-primary);
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.task-due {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.task-due.overdue {
  color: var(--color-danger);
}
</style>
