<script setup lang="ts">
import { ref, computed, watchEffect, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Task, TaskStage, TaskStatus, TaskPriority } from '@/types'
import { useTaskStore, useProjectStore, useUserStore, usePlanningStore } from '@/stores'
import TaskCard from '@/components/task/TaskCard.vue'
import TaskModal from '@/components/task/TaskModal.vue'
import TaskFilter from '@/components/task/TaskFilter.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { buildTaskScheduleExport, copyTextToClipboard } from '@/utils/taskScheduleExport'

interface TaskFilters {
  status?: TaskStatus
  stage?: TaskStage
  priority?: TaskPriority
  assigneeId?: string | null
  myParticipationOnly?: boolean
}

interface KanbanRequirementEntry {
  kind: 'requirement'
  requirement: Task
  childTasks: Task[]
}

interface KanbanTaskEntry {
  kind: 'task'
  task: Task
}

type KanbanEntry = KanbanRequirementEntry | KanbanTaskEntry

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const userStore = useUserStore()
const planningStore = usePlanningStore()

const filters = ref<TaskFilters>({
  stage: undefined,
  priority: undefined,
  assigneeId: undefined,
  myParticipationOnly: false
})

const selectedPlanningId = computed(() => projectStore.selectedPlanningId)
const isProjectManager = computed(() => userStore.isAdmin || userStore.currentUser?.role === 'pm')

const isModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)
const showAbandoned = ref(false)
const childParentRequirementId = ref<string | null>(null)
const collapsedRequirementIds = ref<Set<string>>(new Set())
const exportMessage = ref('')

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

// 拉取最新任务数据（REST API 回退）
watchEffect(() => {
  const projectId = projectStore.currentProjectId
  if (projectId) {
    taskStore.fetchTasks(projectId)
  }
})

// 从消息中心跳转时自动打开任务弹框
async function handleOpenTaskFromQuery() {
  const taskId = route.query.taskId as string | undefined
  if (!taskId) return
  // 立即清除 query，避免刷新重复打开
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

// 监听后续从消息中心跳转过来的情况（同页导航）
watch(() => route.query.taskId, (taskId) => {
  if (taskId) {
    handleOpenTaskFromQuery()
  }
})

const columns = computed(() => {
  const cols = ([
    { id: 'todo', title: '待办' },
    { id: 'in-progress', title: '进行中' },
    { id: 'done', title: '已完成' }
  ] as Array<{ id: TaskStatus, title: string }>).map(column => {
    const tasks = filteredTasks.value.filter(t => t.status === column.id)
    return {
      ...column,
      tasks,
      entries: buildKanbanEntries(tasks),
      count: tasks.length
    }
  })
  if (showAbandoned.value) {
    const tasks = filteredTasks.value.filter(t => t.status === 'abandoned')
    cols.push({
      id: 'abandoned',
      title: '已废弃',
      tasks,
      entries: buildKanbanEntries(tasks),
      count: tasks.length
    })
  }
  return cols
})

const visibleRequirementIds = computed(() => {
  const ids = new Set<string>()
  columns.value.forEach(column => {
    column.entries.forEach(entry => {
      if (entry.kind === 'requirement') {
        ids.add(entry.requirement.id)
      }
    })
  })
  return Array.from(ids)
})

function buildKanbanEntries(tasks: Task[]): KanbanEntry[] {
  const groups = new Map<string, KanbanRequirementEntry>()
  const orderedRequirementIds: string[] = []
  const standaloneTasks: Task[] = []

  function ensureGroup(requirement: Task): KanbanRequirementEntry {
    let group = groups.get(requirement.id)
    if (!group) {
      group = {
        kind: 'requirement',
        requirement,
        childTasks: []
      }
      groups.set(requirement.id, group)
      orderedRequirementIds.push(requirement.id)
    }
    return group
  }

  for (const task of tasks) {
    if (taskStore.isRequirement(task)) {
      ensureGroup(task)
      continue
    }

    if (task.parentRequirementId) {
      const requirement = taskStore.tasks.find(t => t.id === task.parentRequirementId)
      if (requirement && taskStore.isRequirement(requirement)) {
        ensureGroup(requirement).childTasks.push(task)
        continue
      }
    }

    standaloneTasks.push(task)
  }

  return [
    ...orderedRequirementIds.map(id => groups.get(id)!).filter(Boolean),
    ...standaloneTasks.map(task => ({ kind: 'task' as const, task }))
  ]
}

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

function isTaskFilterActive() {
  return !!filters.value.stage ||
    filters.value.assigneeId !== undefined && filters.value.assigneeId !== null ||
    !!filters.value.myParticipationOnly
}

const filteredTasks = computed(() => {
  const projectId = projectStore.currentProjectId
  const planningId = selectedPlanningId.value
  const stage = filters.value.stage
  const status = filters.value.status
  const priority = filters.value.priority
  const assigneeId = filters.value.assigneeId
  const myParticipationOnly = filters.value.myParticipationOnly
  const currentUserId = userStore.currentUser?.id

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
    tasks = tasks.filter(t => taskStore.isTaskItem(t) && taskStore.getTaskStageValue(t) === stage)
  }

  // 按优先级过滤
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority)
  }

  // 按负责人过滤
  if (assigneeId !== undefined && assigneeId !== null) {
    tasks = tasks.filter(t => taskStore.isTaskItem(t) && taskStore.isUserParticipating(t, assigneeId))
  }

  // 只显示自己参与的任务
  if (myParticipationOnly) {
    tasks = currentUserId
      ? tasks.filter(t => taskStore.isTaskItem(t) && taskStore.isUserParticipating(t, currentUserId))
      : []
  }

  if (isTaskFilterActive()) {
    tasks = tasks.filter(t => taskStore.isTaskItem(t))
  }

  // 默认隐藏废弃任务
  if (!showAbandoned.value) {
    tasks = tasks.filter(t => t.status !== 'abandoned')
  }

  return tasks
})

function handleFilter(newFilters: TaskFilters) {
  filters.value = { ...filters.value, ...newFilters }
}

const exportPlanning = computed(() => {
  return selectedPlanningId.value ? planningStore.getPlanningById(selectedPlanningId.value) : null
})

const exportPlanningTasks = computed(() => {
  const planningId = selectedPlanningId.value
  const projectId = projectStore.currentProjectId
  if (!planningId) return []
  return taskStore.tasks.filter(task => {
    if (!taskStore.isTaskItem(task)) return false
    if (projectId && task.projectId !== projectId) return false
    if (task.planningId !== planningId) return false
    if (!showAbandoned.value && task.status === 'abandoned') return false
    return true
  })
})

async function exportTaskSchedule() {
  if (!exportPlanning.value) {
    exportMessage.value = '请先选择迭代'
    window.setTimeout(() => {
      exportMessage.value = ''
    }, 2000)
    return
  }

  const content = buildTaskScheduleExport(exportPlanningTasks.value, {
    allTasks: taskStore.tasks,
    planningName: exportPlanning.value.name,
    planningDeadline: exportPlanning.value.deadline,
    getStageLabel: task => taskStore.getTaskStageLabel(task)
  })

  if (!content) {
    exportMessage.value = '暂无可导出的任务'
    window.setTimeout(() => {
      exportMessage.value = ''
    }, 2000)
    return
  }

  try {
    await copyTextToClipboard(content)
    exportMessage.value = '已复制排期'
  } catch {
    exportMessage.value = '复制失败'
  }

  window.setTimeout(() => {
    exportMessage.value = ''
  }, 2000)
}

function isRequirementCollapsed(requirementId: string): boolean {
  return collapsedRequirementIds.value.has(requirementId)
}

function toggleRequirementCollapsed(requirementId: string) {
  const next = new Set(collapsedRequirementIds.value)
  if (next.has(requirementId)) {
    next.delete(requirementId)
  } else {
    next.add(requirementId)
  }
  collapsedRequirementIds.value = next
}

function expandAllRequirements() {
  const next = new Set(collapsedRequirementIds.value)
  visibleRequirementIds.value.forEach(id => next.delete(id))
  collapsedRequirementIds.value = next
}

function collapseAllRequirements() {
  collapsedRequirementIds.value = new Set(visibleRequirementIds.value)
}

function openNewTaskModal() {
  selectedTask.value = null
  childParentRequirementId.value = null
  isModalOpen.value = true
}

function openEditTaskModal(task: Task) {
  selectedTask.value = task
  childParentRequirementId.value = null
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedTask.value = null
  childParentRequirementId.value = null
}

function openChildTaskModal(requirementId: string) {
  selectedTask.value = null
  childParentRequirementId.value = requirementId
  isModalOpen.value = true
}

async function handleSave(taskData: Partial<Task>) {
  let saved: Task | null = null
  if (selectedTask.value) {
    saved = await taskStore.updateTask(selectedTask.value.id, taskData, userStore.currentUser?.id)
  } else {
    saved = await taskStore.createTask({
      title: taskData.title || '',
      description: taskData.description || '',
      itemType: taskData.itemType || 'task',
      parentRequirementId: taskData.parentRequirementId || null,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      projectId: taskData.projectId || projectStore.currentProjectId || '',
      assigneeId: taskData.assigneeId || null,
      stage: taskData.stage || 'filed',
      phases: taskData.phases || [],
      currentPhaseId: taskData.currentPhaseId || null,
      planningId: taskData.planningId || null,
      references: taskData.references || [],
      comments: taskData.comments || []
    })
  }

  if (saved) {
    closeModal()
  }
}

async function handleDelete(taskId: string) {
  const success = await taskStore.deleteTask(taskId)
  if (success) {
    closeModal()
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

async function handleDrop(e: DragEvent, status: TaskStatus) {
  e.preventDefault()
  if (!isProjectManager.value) return
  const taskId = e.dataTransfer?.getData('text/plain')
  if (taskId) {
    await taskStore.moveTask(taskId, status, userStore.currentUser?.id)
  }
}

function getRequirementProgressText(requirement: Task): string {
  const progress = taskStore.getRequirementProgress(requirement.id)
  return progress.total === 0 ? '待拆分' : `${progress.done}/${progress.total}`
}
</script>

<template>
  <div class="page kanban-page">
    <div class="page-header">
      <div class="header-content">
      </div>
      <label class="abandoned-toggle">
        <input type="checkbox" v-model="showAbandoned" :disabled="abandonedCount === 0" />
        <span>显示废弃任务({{ abandonedCount }})</span>
      </label>
      <div class="requirement-toolbar">
        <button class="btn btn-secondary btn-sm" :disabled="visibleRequirementIds.length === 0" @click="expandAllRequirements">
          展开全部
        </button>
        <button class="btn btn-secondary btn-sm" :disabled="visibleRequirementIds.length === 0" @click="collapseAllRequirements">
          折叠全部
        </button>
      </div>
      <div class="export-toolbar">
        <button class="btn btn-secondary" :disabled="!exportPlanning || exportPlanningTasks.length === 0" @click="exportTaskSchedule">
          导出排期
        </button>
        <span v-if="exportMessage" class="export-message">{{ exportMessage }}</span>
      </div>
      <button v-if="isProjectManager" class="btn btn-primary" @click="openNewTaskModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建任务
      </button>
    </div>

    <TaskFilter :show-status-filter="false" @filter="handleFilter" />

    <div v-if="filteredTasks.length > 0" class="kanban-board" :class="{ 'show-abandoned': showAbandoned }">
      <div
        v-for="column in columns"
        :key="column.id"
        class="kanban-column"
        @dragover="handleDragOver"
        @drop="handleDrop($event, column.id as TaskStatus)"
      >
        <div class="column-header">
          <h3 class="column-title">{{ column.title }}</h3>
          <span class="column-count">{{ column.count }}</span>
        </div>
        <div class="column-content">
          <template v-for="entry in column.entries" :key="entry.kind === 'requirement' ? `req-${entry.requirement.id}` : `task-${entry.task.id}`">
            <div
              v-if="entry.kind === 'requirement'"
              class="requirement-group"
              :class="{ 'requirement-group--empty': entry.childTasks.length === 0 }"
            >
              <div class="requirement-group-header" @click="openEditTaskModal(entry.requirement)">
                <div>
                  <div class="requirement-title-line">
                    <span class="requirement-group-title">{{ entry.requirement.title }}</span>
                    <span class="item-type requirement">需求单</span>
                    <button
                      v-if="entry.childTasks.length > 0"
                      class="btn btn-ghost btn-sm requirement-toggle"
                      :aria-expanded="!isRequirementCollapsed(entry.requirement.id)"
                      @click.stop="toggleRequirementCollapsed(entry.requirement.id)"
                    >
                      {{ isRequirementCollapsed(entry.requirement.id) ? '展开' : '折叠' }}
                    </button>
                  </div>
                  <div class="requirement-group-meta">
                    <span>拆分进度：{{ getRequirementProgressText(entry.requirement) }}</span>
                    <span>{{ entry.childTasks.length }} 个任务</span>
                  </div>
                </div>
                <div v-if="isProjectManager" class="requirement-actions">
                  <button class="btn btn-primary requirement-add-button" @click.stop="openChildTaskModal(entry.requirement.id)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    新增任务
                  </button>
                </div>
              </div>
              <div
                v-if="entry.childTasks.length > 0 && !isRequirementCollapsed(entry.requirement.id)"
                class="requirement-child-list"
              >
                <TaskCard
                  v-for="childTask in entry.childTasks"
                  :key="childTask.id"
                  :task="childTask"
                  :draggable="isProjectManager"
                  @click="openEditTaskModal(childTask)"
                />
              </div>
            </div>
            <TaskCard
              v-else
              :task="entry.task"
              :draggable="isProjectManager"
              @click="openEditTaskModal(entry.task)"
            />
          </template>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="暂无任务"
      :description="isProjectManager ? '创建您的第一个任务开始使用' : '暂无任务'"
      :action-text="isProjectManager ? '创建任务' : ''"
      @action="openNewTaskModal"
    />

    <TaskModal
      :is-open="isModalOpen"
      :task="selectedTask"
      :project-id="projectStore.currentProjectId || ''"
      :initial-parent-requirement-id="childParentRequirementId"
      :initial-planning-id="selectedPlanningId"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
      @create-child="openChildTaskModal"
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

.requirement-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
}

.export-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px;
}

.export-message {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
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

.kanban-board.show-abandoned {
  grid-template-columns: repeat(4, 1fr);
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

.requirement-group {
  padding: 10px;
  border: 1px solid #94a3b8;
  border-radius: var(--radius-md);
  background-color: #f8fafc;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  transition: background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.requirement-group:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm), inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}

.requirement-group--empty .requirement-group-header {
  margin-bottom: 0;
}

.requirement-group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.requirement-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.requirement-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.requirement-toggle {
  padding: 2px 8px;
}

.item-type {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background-color: #e0f2fe;
  color: #0369a1;
  font-weight: 600;
  white-space: nowrap;
}

.item-type.requirement {
  background-color: #e2e8f0;
  color: #334155;
}

.requirement-group-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.requirement-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.requirement-child-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 10px;
  border-left: 2px solid #cbd5e1;
}


.requirement-add-button {
  min-width: 96px;
  padding: 7px 12px;
  font-size: 13px;
  white-space: nowrap;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .page-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .requirement-toolbar {
    margin-right: 0;
  }

  .export-toolbar {
    margin-right: 0;
  }
}
</style>
