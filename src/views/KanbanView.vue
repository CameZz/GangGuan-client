<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { useTaskStore, useProjectStore } from '@/stores'
import TaskCard from '@/components/task/TaskCard.vue'
import TaskModal from '@/components/task/TaskModal.vue'
import TaskFilter from '@/components/task/TaskFilter.vue'
import EmptyState from '@/components/common/EmptyState.vue'

interface TaskFilters {
  projectId?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
}

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()

const filters = ref<TaskFilters>({
  projectId: route.params.projectId as string | undefined,
  status: undefined,
  priority: undefined,
  assigneeId: undefined
})

const isModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)

const columns = computed(() => [
  { id: 'todo', title: '待办', tasks: filteredTasks.value.filter(t => t.status === 'todo') },
  { id: 'in-progress', title: '进行中', tasks: filteredTasks.value.filter(t => t.status === 'in-progress') },
  { id: 'done', title: '已完成', tasks: filteredTasks.value.filter(t => t.status === 'done') }
])

const filteredTasks = computed(() => {
  return taskStore.tasks.filter(task => {
    if (filters.value.projectId && task.projectId !== filters.value.projectId) return false
    if (filters.value.status && task.status !== filters.value.status) return false
    if (filters.value.priority && task.priority !== filters.value.priority) return false
    if (filters.value.assigneeId !== undefined && task.assigneeId !== filters.value.assigneeId) return false
    return true
  })
})

const currentProject = computed(() => {
  if (!filters.value.projectId) return null
  return projectStore.projects.find(p => p.id === filters.value.projectId)
})

function handleFilter(newFilters: TaskFilters) {
  filters.value = { ...filters.value, ...newFilters }
}

function openNewTaskModal() {
  selectedTask.value = null
  isModalOpen.value = true
}

function openEditTaskModal(task: Task) {
  selectedTask.value = task
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedTask.value = null
}

function handleSave(taskData: Partial<Task>) {
  if (selectedTask.value) {
    taskStore.updateTask(selectedTask.value.id, taskData)
  } else {
    taskStore.createTask({
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      projectId: taskData.projectId || filters.value.projectId || '',
      assigneeId: taskData.assigneeId || null,
      stage: taskData.stage || 'filed',
      planningId: taskData.planningId || null,
      participants: taskData.participants || [],
      references: taskData.references || [],
      comments: taskData.comments || []
    })
  }
  closeModal()
}

function handleDelete(taskId: string) {
  taskStore.deleteTask(taskId)
  closeModal()
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDrop(e: DragEvent, status: TaskStatus) {
  e.preventDefault()
  const taskId = e.dataTransfer?.getData('text/plain')
  if (taskId) {
    taskStore.moveTask(taskId, status)
  }
}
</script>

<template>
  <div class="page kanban-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ currentProject?.name || '所有任务' }}</h1>
        <p v-if="currentProject" class="page-subtitle">{{ currentProject.description }}</p>
      </div>
      <button class="btn btn-primary" @click="openNewTaskModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建任务
      </button>
    </div>

    <TaskFilter :project-id="filters.projectId" @filter="handleFilter" />

    <div v-if="filteredTasks.length > 0" class="kanban-board">
      <div
        v-for="column in columns"
        :key="column.id"
        class="kanban-column"
        @dragover="handleDragOver"
        @drop="handleDrop($event, column.id as TaskStatus)"
      >
        <div class="column-header">
          <h3 class="column-title">{{ column.title }}</h3>
          <span class="column-count">{{ column.tasks.length }}</span>
        </div>
        <div class="column-content">
          <TaskCard
            v-for="task in column.tasks"
            :key="task.id"
            :task="task"
            @click="openEditTaskModal(task)"
          />
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="暂无任务"
      description="创建您的第一个任务开始使用"
      action-text="创建任务"
      @action="openNewTaskModal"
    />

    <TaskModal
      :is-open="isModalOpen"
      :task="selectedTask"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.kanban-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
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

.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.kanban-column {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-lg);
  padding: 12px;
  min-height: 400px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.column-count {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-full);
}

.column-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
</style>
