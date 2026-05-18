<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import type { Task, TaskStatus, TaskStage, TaskPriority } from '@/types'
import { TASK_STAGES } from '@/types'
import { useTaskStore, useProjectStore, useMemberStore, useUserStore } from '@/stores'
import TaskModal from '@/components/task/TaskModal.vue'
import TaskFilter from '@/components/task/TaskFilter.vue'
import MemberAvatar from '@/components/member/MemberAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'

interface TaskFilters {
  status?: TaskStatus
  stage?: TaskStage
  priority?: TaskPriority
  assigneeId?: string | null
}

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const userStore = useUserStore()

const filters = ref<TaskFilters>({
  stage: undefined,
  priority: undefined,
  assigneeId: undefined
})

const selectedPlanningId = computed(() => projectStore.selectedPlanningId)

const isModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)
const showAbandoned = ref(false)

// 排序状态
type SortField = 'title' | 'status' | 'stage' | 'priority' | 'assignee' | 'dueDate' | null
type SortDirection = 'asc' | 'desc' | null
const sortField = ref<SortField>(null)
const sortDirection = ref<SortDirection>(null)

// 状态排序权重
const statusOrder: Record<string, number> = {
  'todo': 0,
  'in-progress': 1,
  'done': 2,
  'abandoned': 3
}

// 优先级排序权重
const priorityOrder: Record<string, number> = {
  'high': 0,
  'medium': 1,
  'low': 2
}

// 阶段排序权重
const stageOrder: Record<string, number> = {
  'filed': 0,
  'designing': 1,
  'initial': 2,
  'preliminary': 3,
  'final': 4,
  'finalAcceptance': 5,
  'completed': 6
}

// Windows 文件名排序比较函数
function windowsCompare(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  return aLower.localeCompare(bLower, 'zh-CN')
}

function toggleSort(field: SortField) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDirection.value = 'asc'
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc'
  } else {
    sortField.value = null
    sortDirection.value = null
  }
}

function getSortIcon(field: SortField): string {
  if (sortField.value !== field) return ''
  if (sortDirection.value === 'asc') return ' ↑'
  if (sortDirection.value === 'desc') return ' ↓'
  return ''
}

// Sync projectId from route (only when it changes)
watchEffect(() => {
  const projectId = route.params.projectId as string | undefined
  if (projectId && projectStore.currentProjectId !== projectId) {
    projectStore.setCurrentProject(projectId)
  }
})

// Sync planningId from route (only when it changes)
watchEffect(() => {
  const planningId = route.query.planning as string | undefined
  if (planningId && projectStore.selectedPlanningId !== planningId) {
    projectStore.setSelectedPlanning(planningId)
  }
})

const abandonedCount = computed(() => {
  const projectId = projectStore.currentProjectId
  const planningId = selectedPlanningId.value
  let tasks = taskStore.tasks.filter(t => t.status === 'abandoned')
  if (projectId) {
    tasks = tasks.filter(t => t.projectId === projectId)
  }
  if (planningId) {
    tasks = tasks.filter(t => t.planningId === planningId)
  }
  return tasks.length
})

const filteredTasks = computed(() => {
  const projectId = projectStore.currentProjectId
  const planningId = selectedPlanningId.value
  const stage = filters.value.stage
  const status = filters.value.status

  // 先按项目过滤
  let tasks = taskStore.tasks
  if (projectId) {
    tasks = tasks.filter(t => t.projectId === projectId)
  }

  // 再按迭代过滤（如果有选中迭代）
  if (planningId) {
    tasks = tasks.filter(t => t.planningId === planningId)
  }

  // 按状态过滤
  if (status) {
    tasks = tasks.filter(t => t.status === status)
  }

  // 按阶段过滤
  if (stage) {
    tasks = tasks.filter(t => t.stage === stage)
  }

  // 默认隐藏废弃任务
  if (!showAbandoned.value) {
    tasks = tasks.filter(t => t.status !== 'abandoned')
  }

  // 排序
  if (sortField.value && sortDirection.value) {
    const dir = sortDirection.value === 'asc' ? 1 : -1
    tasks = [...tasks].sort((a, b) => {
      switch (sortField.value) {
        case 'title':
          return windowsCompare(a.title, b.title) * dir
        case 'status':
          return ((statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)) * dir
        case 'stage':
          return ((stageOrder[a.stage] ?? 0) - (stageOrder[b.stage] ?? 0)) * dir
        case 'priority':
          return ((priorityOrder[a.priority] ?? 0) - (priorityOrder[b.priority] ?? 0)) * dir
        case 'assignee': {
          const aName = getMember(a.assigneeId)?.name || ''
          const bName = getMember(b.assigneeId)?.name || ''
          return windowsCompare(aName, bName) * dir
        }
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          return (aDate - bDate) * dir
        }
        default:
          return 0
      }
    })
  }

  return tasks
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
    taskStore.updateTask(selectedTask.value.id, taskData, userStore.currentUser?.id)
  } else {
    taskStore.createTask({
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      projectId: taskData.projectId || projectStore.currentProjectId || '',
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成', 'abandoned': '已废弃' }
  return labels[status] || status
}

function getStageLabel(stage: string): string {
  const s = TASK_STAGES.find(t => t.value === stage)
  return s?.label || stage
}
</script>

<template>
  <div class="page list-page">
    <div class="page-header">
      <div class="header-content">
      </div>
      <label class="abandoned-toggle">
        <input type="checkbox" v-model="showAbandoned" :disabled="abandonedCount === 0" />
        <span>显示废弃任务({{ abandonedCount }})</span>
      </label>
      <button class="btn btn-primary" @click="openNewTaskModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建任务
      </button>
    </div>

    <TaskFilter @filter="handleFilter" />

    <div v-if="filteredTasks.length > 0" class="task-table">
      <div class="table-header">
        <div class="col col-title sortable" @click="toggleSort('title')">标题{{ getSortIcon('title') }}</div>
        <div class="col col-status sortable" @click="toggleSort('status')">状态{{ getSortIcon('status') }}</div>
        <div class="col col-stage sortable" @click="toggleSort('stage')">阶段{{ getSortIcon('stage') }}</div>
        <div class="col col-priority sortable" @click="toggleSort('priority')">优先级{{ getSortIcon('priority') }}</div>
        <div class="col col-assignee sortable" @click="toggleSort('assignee')">负责人{{ getSortIcon('assignee') }}</div>
        <div class="col col-due sortable" @click="toggleSort('dueDate')">截止日期{{ getSortIcon('dueDate') }}</div>
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
              {{ getStatusLabel(task.status) }}
            </span>
          </div>
          <div class="col col-stage">
            <span class="stage-badge">{{ getStageLabel(task.stage) }}</span>
          </div>
          <div class="col col-priority">
            <span class="badge" :class="`badge-${task.priority}`">
              {{ task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : '高' }}
            </span>
          </div>
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
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
}

.abandoned-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  height: 36px;
}

.abandoned-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.abandoned-toggle input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.abandoned-toggle input[type="checkbox"]:disabled + span {
  opacity: 0.5;
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

.sortable {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.sortable:hover {
  color: var(--color-text-primary);
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

.col-stage {
  flex: 0.8;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
}

.col-priority {
  flex: 0.6;
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
