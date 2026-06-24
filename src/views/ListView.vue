<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import type { Task, TaskStatus, TaskStage, TaskPriority } from '@/types'
import { useTaskStore, useProjectStore, useMemberStore, useUserStore, usePlanningStore, useApprovalStore } from '@/stores'
import TaskModal from '@/components/task/TaskModal.vue'
import TaskRequestModal from '@/components/task/TaskRequestModal.vue'
import TaskFilter from '@/components/task/TaskFilter.vue'
import MemberAvatar from '@/components/member/MemberAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { buildTaskScheduleExport, copyTextToClipboard } from '@/utils/taskScheduleExport'

interface TaskFilters {
  status?: TaskStatus
  stage?: TaskStage
  priority?: TaskPriority
  assigneeId?: string | null
  myParticipationOnly?: boolean
}

interface ListRequirementEntry {
  kind: 'requirement'
  requirement: Task
  childTasks: Task[]
}

interface ListTaskEntry {
  kind: 'task'
  task: Task
}

type ListEntry = ListRequirementEntry | ListTaskEntry

const route = useRoute()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const userStore = useUserStore()
const planningStore = usePlanningStore()
const approvalStore = useApprovalStore()

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

// 申请任务弹框
const isRequestModalOpen = ref(false)
const requestSaving = ref(false)
const requestError = ref('')

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

// 拉取最新任务数据（REST API 回退）
watchEffect(() => {
  const projectId = projectStore.currentProjectId
  if (projectId) {
    taskStore.fetchTasks(projectId)
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
          return ((stageOrder[taskStore.getTaskStageValue(a)] ?? 0) - (stageOrder[taskStore.getTaskStageValue(b)] ?? 0)) * dir
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

const listEntries = computed<ListEntry[]>(() => buildListEntries(filteredTasks.value))

const visibleRequirementIds = computed(() => {
  return listEntries.value
    .filter((entry): entry is ListRequirementEntry => entry.kind === 'requirement')
    .map(entry => entry.requirement.id)
})

function buildListEntries(tasks: Task[]): ListEntry[] {
  const groups = new Map<string, ListRequirementEntry>()
  const orderedRequirementIds: string[] = []
  const standaloneTasks: Task[] = []

  function ensureGroup(requirement: Task): ListRequirementEntry {
    let group = groups.get(requirement.id)
    if (!group) {
      group = {
        kind: 'requirement',
        requirement,
        childTasks: getVisibleRequirementChildTasks(requirement.id)
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
        ensureGroup(requirement)
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

function getScopedVisibleTasks(): Task[] {
  const projectId = projectStore.currentProjectId
  const planningId = selectedPlanningId.value
  let tasks = taskStore.tasks

  if (projectId) {
    tasks = tasks.filter(t => t.projectId === projectId)
  }

  if (planningId) {
    tasks = tasks.filter(t => t.planningId === planningId)
  }

  if (!showAbandoned.value) {
    tasks = tasks.filter(t => t.status !== 'abandoned')
  }

  return tasks
}

function getVisibleRequirementChildTasks(requirementId: string): Task[] {
  return getScopedVisibleTasks().filter(task =>
    taskStore.isTaskItem(task) && task.parentRequirementId === requirementId
  )
}

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

// 申请任务
function openRequestModal() {
  isRequestModalOpen.value = true
  requestError.value = ''
}

function closeRequestModal() {
  isRequestModalOpen.value = false
  requestError.value = ''
}

async function handleRequestSubmit(data: { title: string; remark: string; phaseSnapshot: { name: string; assigneeId: string | null }[]; projectId: string; planningId: string; parentRequirementId?: string | null }) {
  requestSaving.value = true
  requestError.value = ''
  try {
    await approvalStore.submitRequest(data)
    closeRequestModal()
  } catch (error: any) {
    requestError.value = error.message || '提交申请失败'
  } finally {
    requestSaving.value = false
  }
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

function getTaskStageLabel(task: Task): string {
  return taskStore.getTaskStageLabel(task)
}

function getParentRequirement(task: Task): Task | null {
  if (!task.parentRequirementId) return null
  return taskStore.tasks.find(t => t.id === task.parentRequirementId) || null
}

function getItemTypeLabel(task: Task): string {
  return taskStore.isRequirement(task) ? '需求单' : '任务单'
}

function getRequirementProgressText(task: Task): string {
  const progress = taskStore.getRequirementProgress(task.id)
  return progress.total === 0 ? '待拆分' : `${progress.done}/${progress.total}`
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
      <button class="btn btn-secondary" @click="openRequestModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 18v-6" />
          <path d="M9 15h6" />
        </svg>
        申请任务
      </button>
      <button v-if="isProjectManager" class="btn btn-primary" @click="openNewTaskModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建任务
      </button>
    </div>

    <!-- 申请任务弹框 -->
    <TaskRequestModal
      :is-open="isRequestModalOpen"
      :project-id="projectStore.currentProjectId || undefined"
      :saving="requestSaving"
      :error="requestError"
      @close="closeRequestModal"
      @save="handleRequestSubmit"
    />

    <TaskFilter @filter="handleFilter" />

    <div v-if="listEntries.length > 0" class="task-table">
      <div class="table-header">
        <div class="col col-title sortable" @click="toggleSort('title')">标题{{ getSortIcon('title') }}</div>
        <div class="col col-status sortable" @click="toggleSort('status')">状态{{ getSortIcon('status') }}</div>
        <div class="col col-stage sortable" @click="toggleSort('stage')">阶段{{ getSortIcon('stage') }}</div>
        <div class="col col-priority sortable" @click="toggleSort('priority')">优先级{{ getSortIcon('priority') }}</div>
        <div class="col col-assignee sortable" @click="toggleSort('assignee')">负责人{{ getSortIcon('assignee') }}</div>
        <div class="col col-due sortable" @click="toggleSort('dueDate')">截止日期{{ getSortIcon('dueDate') }}</div>
        <div class="col col-action">操作</div>
      </div>
      <div class="table-body">
        <template v-for="entry in listEntries" :key="entry.kind === 'requirement' ? `req-${entry.requirement.id}` : `task-${entry.task.id}`">
          <div v-if="entry.kind === 'requirement'" class="requirement-list-group">
            <div class="table-row requirement-row" @click="openEditTaskModal(entry.requirement)">
              <div class="col col-title">
                <div class="task-title-line">
                  <span class="task-title">{{ entry.requirement.title }}</span>
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
                <span class="task-desc">拆分进度：{{ getRequirementProgressText(entry.requirement) }} · {{ entry.childTasks.length }} 个任务</span>
              </div>
              <div class="col col-status">
                <span class="badge" :class="`badge-${entry.requirement.status}`">
                  {{ getStatusLabel(entry.requirement.status) }}
                </span>
              </div>
              <div class="col col-stage">
                <span class="stage-badge">需求</span>
              </div>
              <div class="col col-priority">
                <span class="badge" :class="`badge-${entry.requirement.priority}`">
                  {{ entry.requirement.priority === 'low' ? '低' : entry.requirement.priority === 'medium' ? '中' : '高' }}
                </span>
              </div>
              <div class="col col-assignee">
                <span class="muted">-</span>
              </div>
              <div class="col col-due">-</div>
              <div v-if="isProjectManager" class="col col-action">
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
              class="requirement-child-rows"
            >
              <div
                v-for="childTask in entry.childTasks"
                :key="childTask.id"
                class="table-row child-row"
                @click="openEditTaskModal(childTask)"
              >
                <div class="col col-title">
                  <div class="task-title-line">
                    <span class="task-title">{{ childTask.title }}</span>
                    <span class="item-type">任务单</span>
                  </div>
                </div>
                <div class="col col-status">
                  <span class="badge" :class="`badge-${childTask.status}`">
                    {{ getStatusLabel(childTask.status) }}
                  </span>
                </div>
                <div class="col col-stage">
                  <span class="stage-badge">{{ getTaskStageLabel(childTask) }}</span>
                </div>
                <div class="col col-priority">
                  <span class="badge" :class="`badge-${childTask.priority}`">
                    {{ childTask.priority === 'low' ? '低' : childTask.priority === 'medium' ? '中' : '高' }}
                  </span>
                </div>
                <div class="col col-assignee">
                  <MemberAvatar :member="getMember(childTask.assigneeId)" size="sm" show-name />
                </div>
                <div class="col col-due">{{ formatDate(childTask.dueDate) }}</div>
                <div class="col col-action"></div>
              </div>
            </div>
          </div>
          <div
            v-else
            class="table-row"
            @click="openEditTaskModal(entry.task)"
          >
            <div class="col col-title">
              <div class="task-title-line">
                <span class="task-title">{{ entry.task.title }}</span>
                <span class="item-type">
                  {{ getItemTypeLabel(entry.task) }}
                </span>
              </div>
            </div>
            <div class="col col-status">
              <span class="badge" :class="`badge-${entry.task.status}`">
                {{ getStatusLabel(entry.task.status) }}
              </span>
            </div>
            <div class="col col-stage">
              <span class="stage-badge">{{ getTaskStageLabel(entry.task) }}</span>
            </div>
            <div class="col col-priority">
              <span class="badge" :class="`badge-${entry.task.priority}`">
                {{ entry.task.priority === 'low' ? '低' : entry.task.priority === 'medium' ? '中' : '高' }}
              </span>
            </div>
            <div class="col col-assignee">
              <MemberAvatar :member="getMember(entry.task.assigneeId)" size="sm" show-name />
            </div>
            <div class="col col-due">{{ formatDate(entry.task.dueDate) }}</div>
            <div class="col col-action"></div>
          </div>
        </template>
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

.task-table {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 8px 12px;
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
  align-items: center;
  padding: 8px 12px;
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

.requirement-list-group {
  margin: 6px 8px;
  border: 1px solid #94a3b8;
  border-radius: var(--radius-md);
  background-color: #f8fafc;
  overflow: hidden;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.requirement-list-group:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.requirement-list-group:hover .requirement-row {
  background-color: var(--color-bg-secondary);
}

.requirement-list-group + .requirement-list-group,
.requirement-list-group + .table-row,
.table-row + .requirement-list-group {
  margin-top: 6px;
}

.requirement-row {
  background-color: #f8fafc;
  border-bottom: 1px solid #cbd5e1;
}

.requirement-child-rows {
  padding-left: 14px;
  border-left: 2px solid #cbd5e1;
  margin-left: 12px;
}

.child-row {
  background-color: var(--color-bg-primary);
}


.col {
  display: flex;
  align-items: center;
  padding: 0 6px;
}

.col-title {
  flex: 2;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 2px;
}

.task-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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

.requirement-toggle {
  padding: 2px 8px;
}

.task-desc {
  font-size: 11px;
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

.col-action {
  flex: 0.9;
  justify-content: flex-end;
}

.requirement-add-button {
  min-width: 96px;
  padding: 7px 12px;
  font-size: 13px;
  white-space: nowrap;
}

.muted {
  color: var(--color-text-muted);
  font-size: 13px;
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
