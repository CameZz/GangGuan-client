<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { useMemberStore } from '@/stores'
import MemberAvatar from '@/components/member/MemberAvatar.vue'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  click: []
  dragstart: [task: Task]
}>()

const memberStore = useMemberStore()

const assignee = computed(() => {
  if (!props.task.assigneeId) return null
  return memberStore.getMemberById(props.task.assigneeId)
})

const priorityLabel = computed(() => {
  const labels: Record<string, string> = { low: '低', medium: '中', high: '高' }
  return labels[props.task.priority] || props.task.priority
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成' }
  return labels[props.task.status] || props.task.status
})

const priorityClass = computed(() => `badge-${props.task.priority}`)
const statusClass = computed(() => `badge-${props.task.status}`)

const formattedDueDate = computed(() => {
  if (!props.task.dueDate) return null
  const date = new Date(props.task.dueDate)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})

const isOverdue = computed(() => {
  if (!props.task.dueDate || props.task.status === 'done') return false
  return new Date(props.task.dueDate) < new Date()
})

function handleDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.task.id)
  emit('dragstart', props.task)
}
</script>

<template>
  <div class="task-card" draggable="true" @click="emit('click')" @dragstart="handleDragStart">
    <div class="task-header">
      <span class="badge" :class="priorityClass">{{ priorityLabel }}</span>
      <span class="badge" :class="statusClass">{{ statusLabel }}</span>
    </div>
    <h4 class="task-title">{{ task.title }}</h4>
    <p v-if="task.description" class="task-description">{{ task.description }}</p>
    <div class="task-footer">
      <div v-if="formattedDueDate" class="task-due" :class="{ overdue: isOverdue }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{{ formattedDueDate }}</span>
      </div>
      <MemberAvatar :member="assignee" size="sm" />
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

.task-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.task-card:active {
  transform: scale(0.98);
}

.task-header {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.task-description {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
