<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { useTaskStore, useProjectStore, useMemberStore } from '@/stores'
import TaskModal from '@/components/task/TaskModal.vue'
import TaskFilter from '@/components/task/TaskFilter.vue'
import MemberAvatar from '@/components/member/MemberAvatar.vue'
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
const memberStore = useMemberStore()

const filters = ref<TaskFilters>({
  projectId: route.params.projectId as string | undefined,
  status: undefined,
  priority: undefined,
  assigneeId: undefined
})

const isModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)

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

function getProjectName(projectId: string): string {
  return projectStore.projects.find(p => p.id === projectId)?.name || '未知'
}

function getMember(memberId: string | null) {
  if (!memberId) return null
  return memberStore.getMemberById(memberId)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="page list-page">
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

    <div v-if="filteredTasks.length > 0" class="task-table">
      <div class="table-header">
        <div class="col col-title">标题</div>
        <div class="col col-status">状态</div>
        <div class="col col-priority">优先级</div>
        <div class="col col-project">项目</div>
        <div class="col col-assignee">负责人</div>
        <div class="col col-due">截止日期</div>
      </div>
      <div class="table-body">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="table-row"
          @click="openEditTaskModal(task)"
        >
          <div class="col col-title">
            <span class="task-title">{{ task.title }}</span>
            <span v-if="task.description" class="task-desc">{{ task.description }}</span>
          </div>
          <div class="col col-status">
            <span class="badge" :class="`badge-${task.status}`">
              {{ task.status === 'todo' ? '待办' : task.status === 'in-progress' ? '进行中' : '已完成' }}
            </span>
          </div>
          <div class="col col-priority">
            <span class="badge" :class="`badge-${task.priority}`">
              {{ task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '高' }}
            </span>
          </div>
          <div class="col col-project">{{ getProjectName(task.projectId) }}</div>
          <div class="col col-assignee">
            <MemberAvatar :member="getMember(task.assigneeId)" size="sm" show-name />
          </div>
          <div class="col col-due">{{ formatDate(task.dueDate) }}</div>
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
.list-page {
  max-width: 1400px;
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

.task-table {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 12px 16px;
  background-color: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-body {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.table-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: var(--color-bg-secondary);
}

.col {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.col-title {
  flex: 2;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.task-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.col-status {
  flex: 0.8;
}

.col-priority {
  flex: 0.6;
}

.col-project {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.col-assignee {
  flex: 1;
}

.col-due {
  flex: 0.8;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
