<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority, TaskStage, TaskPhase, Reference, Comment, RoleType, TaskHistory, TaskProgressHistory, TaskItemType } from '@/types'
import { HISTORY_FIELD_LABELS, ROLES } from '@/types'
import { useMemberStore, usePlanningStore, useProjectStore, useTaskStore, useUserStore } from '@/stores'
import { createTaskPhaseFromTemplate, getPhaseStatus, getTaskPhaseProgress, getTaskStageLabel, normalizeTaskPhases } from '@/utils/taskPhases'
import MemberAvatar from '@/components/member/MemberAvatar.vue'

const props = defineProps<{
  task?: Task | null
  isOpen: boolean
  projectId?: string
  initialParentRequirementId?: string | null
  initialPlanningId?: string | null
}>()

const emit = defineEmits<{
  close: []
  save: [task: Partial<Task>]
  delete: [id: string]
  createChild: [requirementId: string]
}>()

const memberStore = useMemberStore()
const planningStore = usePlanningStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const userStore = useUserStore()

const members = computed(() => memberStore.members)
const plannings = computed(() => planningStore.plannings)

const form = ref({
  itemType: 'task' as TaskItemType,
  parentRequirementId: null as string | null,
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  assigneeId: null as string | null,
  stage: 'filed' as TaskStage,
  phases: [] as TaskPhase[],
  currentPhaseId: null as string | null,
  planningId: null as string | null,
  references: [] as Reference[],
  comments: [] as Comment[],
  projectId: ''
})

const activeTab = ref<'main' | 'phases' | 'progressHistory' | 'children' | 'references' | 'comments' | 'history'>('main')
const deleteError = ref('')
const phaseTemplateToAdd = ref('')

watch([() => props.isOpen, () => props.task, () => props.initialParentRequirementId, () => props.initialPlanningId], ([open]) => {
  if (open && props.task) {
    loadHistories()
    form.value = {
      itemType: props.task.itemType || 'task',
      parentRequirementId: props.task.parentRequirementId || null,
      title: props.task.title,
      description: props.task.description,
      status: props.task.status,
      priority: props.task.priority,
      dueDate: props.task.dueDate ? props.task.dueDate.split('T')[0] : '',
      assigneeId: props.task.assigneeId,
      stage: props.task.stage || 'filed',
      phases: normalizeTaskPhases(props.task.phases),
      currentPhaseId: props.task.currentPhaseId || null,
      planningId: props.task.planningId || null,
      references: [...(props.task.references || [])],
      comments: [...(props.task.comments || [])],
      projectId: props.task.projectId
    }
  } else if (open) {
    taskHistories.value = []
    progressHistories.value = []
    const parentRequirement = props.initialParentRequirementId
      ? taskStore.tasks.find(t => t.id === props.initialParentRequirementId)
      : null
    const projectId = parentRequirement?.projectId || props.projectId || ''
    // 服务端会在创建任务时自动生成阶段，客户端传递空数组
    form.value = {
      itemType: 'task',
      parentRequirementId: parentRequirement?.id || null,
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      assigneeId: null,
      stage: 'filed',
      phases: [],
      currentPhaseId: null,
      planningId: props.initialPlanningId || null,
      references: [],
      comments: [],
      projectId
    }
  }
  if (open) {
    activeTab.value = 'main'
    deleteError.value = ''
    phaseTemplateToAdd.value = ''
  }
})

const isEditing = computed(() => !!props.task)
const isRequirementItem = computed(() => form.value.itemType === 'requirement')
const isTaskItem = computed(() => form.value.itemType !== 'requirement')
const isChildTaskCreation = computed(() => !!props.initialParentRequirementId && !props.task)

const requirementOptions = computed(() => {
  if (!form.value.projectId || !form.value.planningId) return []
  return taskStore.getRequirementsByProject(form.value.projectId)
    .filter(requirement => requirement.id !== props.task?.id)
    .filter(requirement => requirement.planningId === form.value.planningId)
})

const childTasks = computed(() => {
  if (!props.task?.id || !isRequirementItem.value) return []
  return taskStore.getChildTasks(props.task.id)
})

const deleteBlockedReason = computed(() => {
  if (props.task && isRequirementItem.value && childTasks.value.length > 0) {
    return `该需求单下还有 ${childTasks.value.length} 个任务单，请先移出或删除子任务`
  }
  return ''
})

const availableMembers = computed(() => {
  return members.value
})

const phaseTemplates = computed(() => {
  if (!form.value.projectId) return []
  return projectStore.getEnabledPhaseTemplates(form.value.projectId)
})

const availablePhaseTemplates = computed(() => {
  const selectedTemplateIds = new Set(form.value.phases.map(phase => phase.templateId))
  return phaseTemplates.value.filter(template => !selectedTemplateIds.has(template.id))
})

const phaseProgress = computed(() => getTaskPhaseProgress(form.value.phases))

const currentPhaseLabel = computed(() => getTaskStageLabel({
  phases: form.value.phases,
  stage: form.value.stage,
  status: form.value.status
}))

const currentDisplayPhase = computed(() => {
  return form.value.phases.find(phase => phase.id === form.value.currentPhaseId) ||
    form.value.phases.find(phase => phase.progress < 100) ||
    form.value.phases[0] ||
    null
})

const currentDisplayAssignee = computed(() => {
  return currentDisplayPhase.value ? getPhaseAssignee(currentDisplayPhase.value) : null
})

function handleSubmit() {
  // 服务端会在创建任务时自动生成阶段
  const phases = normalizeTaskPhases(form.value.phases)
  const taskData: Partial<Task> = isRequirementItem.value
    ? {
        ...form.value,
        parentRequirementId: null,
        status: 'todo',
        dueDate: null,
        assigneeId: null,
        stage: 'filed',
        phases: [],
        currentPhaseId: null
      }
    : {
        ...form.value,
        parentRequirementId: form.value.parentRequirementId || null,
        dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null,
        phases
      }
  emit('save', taskData)
}

function handleDelete() {
  deleteError.value = ''
  if (deleteBlockedReason.value) {
    deleteError.value = deleteBlockedReason.value
    return
  }
  if (props.task?.id) {
    emit('delete', props.task.id)
  }
}

function handleItemTypeChange(itemType: TaskItemType) {
  form.value.itemType = itemType
  if (itemType === 'requirement') {
    form.value.parentRequirementId = null
    form.value.assigneeId = null
    form.value.dueDate = ''
    form.value.phases = []
    form.value.currentPhaseId = null
  }
  // 服务端会在创建任务时自动生成阶段
}

function addReference() {
  form.value.references.push({
    type: 'link',
    url: '',
    title: ''
  })
}

function removeReference(index: number) {
  form.value.references.splice(index, 1)
}

function addComment() {
  const authorId = userStore.currentUser?.id || members.value[0]?.id
  if (authorId) {
    form.value.comments.push({
      id: Date.now().toString(),
      authorId,
      content: '',
      createdAt: new Date().toISOString()
    })
  }
}

function removeComment(index: number) {
  form.value.comments.splice(index, 1)
}

function getMemberName(memberId: string): string {
  const member = members.value.find(m => m.id === memberId)
  return member?.name || '未分配'
}

const taskHistories = ref<TaskHistory[]>([])
const progressHistories = ref<TaskProgressHistory[]>([])

async function loadHistories() {
  if (props.task?.id) {
    taskHistories.value = await taskStore.getTaskHistories(props.task.id)
    progressHistories.value = await taskStore.getTaskProgressHistories(props.task.id)
  } else {
    taskHistories.value = []
    progressHistories.value = []
  }
}

function addTaskPhase() {
  const template = phaseTemplates.value.find(item => item.id === phaseTemplateToAdd.value)
  if (!template) return
  form.value.phases.push(createTaskPhaseFromTemplate(template, form.value.phases.length))
  phaseTemplateToAdd.value = ''
}

function removeTaskPhase(index: number) {
  form.value.phases.splice(index, 1)
  reorderTaskPhases()
}

function moveTaskPhase(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= form.value.phases.length) return
  const [phase] = form.value.phases.splice(index, 1)
  form.value.phases.splice(targetIndex, 0, phase)
  reorderTaskPhases()
}

function reorderTaskPhases() {
  form.value.phases = form.value.phases.map((phase, order) => ({ ...phase, order }))
}

function updateTaskPhaseAssignee(index: number, assigneeId: string) {
  form.value.phases[index].assigneeId = assigneeId || null
}

function updateTaskPhaseStartTime(index: number, dateStr: string) {
  form.value.phases[index].startTime = dateStr ? new Date(dateStr).toISOString() : null
}

function updateTaskPhaseEndTime(index: number, dateStr: string) {
  form.value.phases[index].endTime = dateStr ? new Date(dateStr).toISOString() : null
}

function updateTaskPhaseProgress(index: number, progress: number) {
  const value = Math.min(100, Math.max(0, Math.round(progress)))
  form.value.phases[index].progress = value
  form.value.phases[index].status = getPhaseStatus(value)
}

function canEditPhaseProgress(phase: TaskPhase): boolean {
  return taskStore.canEditTaskPhaseProgress(phase, userStore.currentUser?.id)
}

function getPhaseAssignee(phase: TaskPhase | null | undefined) {
  if (!phase?.assigneeId) return null
  return members.value.find(member => member.id === phase.assigneeId) || null
}

function getHistoryFieldLabel(field: string): string {
  return HISTORY_FIELD_LABELS[field] || field
}

function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    todo: '待办',
    'in-progress': '进行中',
    done: '已完成',
    abandoned: '已废弃'
  }
  return labels[status]
}

function getProgressDelta(history: TaskProgressHistory): string {
  const delta = history.newProgress - history.oldProgress
  return `${delta > 0 ? '+' : ''}${delta}%`
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title-row">
          <h2 class="modal-title">{{ isEditing ? (isRequirementItem ? '编辑需求单' : '编辑任务单') : '新建单据' }}</h2>
          <div v-if="!isEditing" class="type-selector type-selector--header">
            <button
              class="type-option"
              :class="{ active: form.itemType === 'requirement' }"
              :disabled="isChildTaskCreation"
              @click="handleItemTypeChange('requirement')"
            >
              需求单
            </button>
            <button
              class="type-option"
              :class="{ active: form.itemType === 'task' }"
              @click="handleItemTypeChange('task')"
            >
              任务单
            </button>
          </div>
        </div>
        <button class="btn btn-ghost" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'main' }"
          @click="activeTab = 'main'"
        >基本信息</button>
        <button
          v-if="isEditing && isRequirementItem"
          class="tab"
          :class="{ active: activeTab === 'children' }"
          @click="activeTab = 'children'"
        >拆分任务 ({{ childTasks.length }})</button>
        <button
          v-if="isTaskItem"
          class="tab"
          :class="{ active: activeTab === 'phases' }"
          @click="activeTab = 'phases'"
        >阶段进度 ({{ form.phases.length }})</button>
        <button
          v-if="isEditing && isTaskItem"
          class="tab"
          :class="{ active: activeTab === 'progressHistory' }"
          @click="activeTab = 'progressHistory'"
        >进度历史 ({{ progressHistories.length }})</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'references' }"
          @click="activeTab = 'references'"
        >参考资料 ({{ form.references.length }})</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'comments' }"
          @click="activeTab = 'comments'"
        >评论 ({{ form.comments.length }})</button>
        <button
          v-if="isEditing"
          class="tab"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >历史记录</button>
      </div>

      <div class="modal-body">
        <div v-show="activeTab === 'main'">
          <div class="form-group">
            <label class="label">标题</label>
            <input
              v-model="form.title"
              type="text"
              class="input"
              placeholder="输入任务标题"
            />
          </div>
          <div class="form-group">
            <label class="label">描述</label>
            <textarea
              v-model="form.description"
              class="input textarea"
              placeholder="输入任务描述"
            ></textarea>
          </div>
          <div class="form-row task-meta-row" :class="{ 'task-meta-row--task': isTaskItem }">
            <div v-if="isTaskItem" class="form-group">
              <label class="label">状态</label>
              <select v-model="form.status" class="input select">
                <option value="todo">待办</option>
                <option value="in-progress">进行中</option>
                <option value="done">已完成</option>
                <option value="abandoned">已废弃</option>
              </select>
            </div>
            <div class="form-group">
              <label class="label">优先级</label>
              <select v-model="form.priority" class="input select">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div v-if="isTaskItem" class="form-group">
              <label class="label">所属需求</label>
              <select v-model="form.parentRequirementId" class="input select">
                <option :value="null">不归属需求单</option>
                <option v-for="requirement in requirementOptions" :key="requirement.id" :value="requirement.id">
                  {{ requirement.title }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="isEditing" class="form-group">
            <label class="label">规划</label>
            <select v-model="form.planningId" class="input select">
              <option :value="null">无规划</option>
              <option v-for="planning in plannings" :key="planning.id" :value="planning.id">
                {{ planning.name }}
              </option>
            </select>
          </div>
          <div v-if="isTaskItem" class="form-group">
            <label class="label">任务阶段计划</label>
            <div class="phase-plan">
              <div class="phase-plan-summary">
                <span>当前：{{ currentPhaseLabel }}</span>
                <span>{{ phaseProgress.done }}/{{ phaseProgress.total }} · {{ phaseProgress.percent }}%</span>
              </div>
              <div class="phase-add-row">
                <select v-model="phaseTemplateToAdd" class="input select">
                  <option value="">选择阶段</option>
                  <option v-for="template in availablePhaseTemplates" :key="template.id" :value="template.id">
                    {{ template.name }}
                  </option>
                </select>
                <button class="btn btn-secondary btn-sm" :disabled="!phaseTemplateToAdd" @click="addTaskPhase">添加阶段</button>
              </div>
              <div class="phase-plan-list">
                <div
                  v-for="(phase, index) in form.phases"
                  :key="phase.id"
                  class="phase-plan-row"
                >
                  <div class="phase-order">{{ index + 1 }}</div>
                  <div class="phase-main">
                    <div class="phase-title">{{ phase.name }}</div>
                    <div class="phase-progress-text">{{ phase.progress }}%</div>
                  </div>
                  <select
                    :value="phase.assigneeId || ''"
                    class="input select phase-assignee-select"
                    @change="updateTaskPhaseAssignee(index, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">选择执行者</option>
                    <option v-for="member in availableMembers" :key="member.id" :value="member.id">
                      {{ member.name }}
                    </option>
                  </select>
                  <div class="phase-time-range">
                    <input
                      type="date"
                      class="input"
                      :value="phase.startTime ? phase.startTime.split('T')[0] : ''"
                      @change="updateTaskPhaseStartTime(index, ($event.target as HTMLInputElement).value)"
                      placeholder="开始时间"
                    />
                    <span class="time-separator">至</span>
                    <input
                      type="date"
                      class="input"
                      :value="phase.endTime ? phase.endTime.split('T')[0] : ''"
                      @change="updateTaskPhaseEndTime(index, ($event.target as HTMLInputElement).value)"
                      placeholder="结束时间"
                    />
                  </div>
                  <div class="phase-row-actions">
                    <button
                      class="btn btn-ghost phase-icon-button"
                      :disabled="index === 0"
                      title="上移"
                      aria-label="上移阶段"
                      @click="moveTaskPhase(index, 'up')"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      class="btn btn-ghost phase-icon-button"
                      :disabled="index === form.phases.length - 1"
                      title="下移"
                      aria-label="下移阶段"
                      @click="moveTaskPhase(index, 'down')"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      class="btn btn-ghost phase-icon-button danger"
                      title="删除"
                      aria-label="删除阶段"
                      @click="removeTaskPhase(index)"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div v-if="form.phases.length === 0" class="phase-empty">暂无阶段</div>
              </div>
            </div>
          </div>
          <div v-if="isTaskItem" class="form-row">
            <div class="form-group">
              <label class="label">截止日期</label>
              <input v-model="form.dueDate" type="date" class="input" />
            </div>
            <div class="form-group">
              <label class="label">当前执行者</label>
              <div class="readonly-field">
                <MemberAvatar :member="currentDisplayAssignee" size="sm" />
                <span>{{ currentDisplayAssignee?.name || '未分配' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'children'" class="tab-content">
          <div class="child-task-list">
            <div v-if="childTasks.length === 0" class="child-empty">暂无拆分任务</div>
            <div
              v-for="child in childTasks"
              :key="child.id"
              class="child-task-item"
            >
              <div>
                <div class="child-task-title">{{ child.title }}</div>
                <div class="child-task-meta">{{ getStatusLabel(child.status) }}</div>
              </div>
              <span class="badge" :class="`badge-${child.priority}`">
                {{ child.priority === 'low' ? '低' : child.priority === 'medium' ? '中' : '高' }}
              </span>
            </div>
          </div>
          <button v-if="props.task?.id" class="btn btn-secondary" @click="emit('createChild', props.task.id)">
            新增任务单
          </button>
        </div>

        <div v-show="activeTab === 'phases' && isTaskItem" class="tab-content">
          <div class="phase-progress-list">
            <div
              v-for="(phase, index) in form.phases"
              :key="phase.id"
              class="phase-progress-item"
            >
              <div class="phase-progress-header">
                <div class="phase-progress-member">
                  <MemberAvatar :member="getPhaseAssignee(phase)" size="sm" />
                  <div>
                    <div class="phase-progress-title">{{ phase.name }}</div>
                    <div class="phase-progress-assignee">{{ getPhaseAssignee(phase)?.name || '未分配' }}</div>
                  </div>
                </div>
                <span class="phase-progress-value">{{ phase.progress }}%</span>
              </div>
              <div class="phase-progress-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="phase.progress"
                  :disabled="!canEditPhaseProgress(phase)"
                  @input="updateTaskPhaseProgress(index, Number(($event.target as HTMLInputElement).value))"
                />
              </div>
            </div>
            <div v-if="form.phases.length === 0" class="phase-empty">暂无阶段进度</div>
          </div>
        </div>

        <div v-show="activeTab === 'progressHistory' && isTaskItem" class="tab-content">
          <div v-if="progressHistories.length === 0" class="history-empty">暂无进度修改记录</div>
          <div v-else class="progress-history-list">
            <div
              v-for="history in progressHistories"
              :key="history.id"
              class="progress-history-item"
            >
              <div class="progress-history-row">
                <span class="progress-history-operator">{{ getMemberName(history.operatorId) }}</span>
                <span class="progress-history-body">
                  <span class="progress-history-phase">{{ history.phaseName }}</span>
                  <span class="progress-history-label">进度</span>
                  <span class="progress-history-old">{{ history.oldProgress }}%</span>
                  <span class="progress-history-arrow">→</span>
                  <span class="progress-history-new">{{ history.newProgress }}%</span>
                  <span
                    class="progress-history-delta"
                    :class="{ negative: history.newProgress < history.oldProgress }"
                  >
                    {{ getProgressDelta(history) }}
                  </span>
                </span>
                <span class="progress-history-time">{{ new Date(history.createdAt).toLocaleString('zh-CN') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'references'" class="tab-content">
          <div class="reference-list">
            <div
              v-for="(reference, index) in form.references"
              :key="index"
              class="reference-item"
            >
              <select v-model="reference.type" class="input select">
                <option value="design">设计</option>
                <option value="ui">UI</option>
                <option value="document">文档</option>
                <option value="link">链接</option>
              </select>
              <input
                v-model="reference.title"
                type="text"
                class="input"
                placeholder="标题"
              />
              <input
                v-model="reference.url"
                type="text"
                class="input"
                placeholder="URL"
              />
              <button class="btn btn-ghost btn-sm" @click="removeReference(index)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button class="btn btn-secondary" @click="addReference">添加参考资料</button>
        </div>

        <div v-show="activeTab === 'comments'" class="tab-content">
          <div class="comment-list">
            <div
              v-for="(comment, index) in form.comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-header">
                <span class="comment-author">{{ getMemberName(comment.authorId) }}</span>
                <span class="comment-date">{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
              </div>
              <textarea
                v-model="comment.content"
                class="input textarea"
                placeholder="输入评论内容"
              ></textarea>
              <button class="btn btn-ghost btn-sm" @click="removeComment(index)">删除</button>
            </div>
          </div>
          <button class="btn btn-secondary" @click="addComment">添加评论</button>
        </div>

        <div v-show="activeTab === 'history'" class="tab-content">
          <div v-if="taskHistories.length === 0" class="history-empty">暂无变更记录</div>
          <div v-else class="history-list">
            <div
              v-for="history in taskHistories"
              :key="history.id"
              class="history-item"
            >
              <div class="history-dot"></div>
              <div class="history-content">
                <div class="history-text">
                  <span class="history-operator">{{ getMemberName(history.operatorId) }}</span>
                  将
                  <span class="history-field">{{ getHistoryFieldLabel(history.field) }}</span>
                  从
                  <span class="history-old">{{ history.oldValue }}</span>
                  修改为
                  <span class="history-new">{{ history.newValue }}</span>
                </div>
                <div class="history-time">{{ new Date(history.createdAt).toLocaleString('zh-CN') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div v-if="deleteError" class="delete-error">{{ deleteError }}</div>
        <button v-if="isEditing" class="btn btn-danger" :disabled="!!deleteBlockedReason" @click="handleDelete">删除</button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-lg {
  max-width: 960px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.tab {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-primary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-content {
  padding: 16px 0;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.type-selector {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.type-selector--header {
  flex-shrink: 0;
}

.type-option {
  min-width: 72px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-fast);
}

.type-option.active {
  background-color: var(--color-bg-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.type-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.task-meta-row--task {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
}

.task-meta-row .form-group {
  min-width: 0;
}

.phase-plan {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
}

.phase-plan-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.phase-add-row {
  display: flex;
  gap: 8px;
}

.phase-add-row .select {
  flex: 1;
}

.phase-plan-list,
.phase-progress-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-plan-row {
  display: grid;
  grid-template-columns: 30px minmax(120px, 1fr) 132px 230px 92px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
}

.phase-order {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.phase-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.phase-title {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phase-progress-text {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.phase-row-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  white-space: nowrap;
}

.phase-assignee-select {
  width: 132px;
  min-width: 0;
  padding-left: 8px;
  padding-right: 24px;
}

.phase-time-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.phase-time-range .input {
  width: 100%;
  min-width: 0;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 12px;
}

.time-separator {
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

.phase-icon-button {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.phase-icon-button.danger {
  color: var(--color-danger);
}

.phase-empty {
  padding: 14px;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  font-size: 13px;
}

@media (max-width: 920px) {
  .task-meta-row--task {
    grid-template-columns: 1fr 1fr;
  }

  .task-meta-row--task .form-group:last-child {
    grid-column: 1 / 3;
  }

  .phase-plan-row {
    grid-template-columns: 30px minmax(0, 1fr) 132px 92px;
  }

  .phase-time-range {
    grid-column: 2 / 5;
  }
}

@media (max-width: 640px) {
  .modal-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .task-meta-row,
  .task-meta-row--task {
    grid-template-columns: 1fr;
  }

  .task-meta-row--task .form-group:last-child {
    grid-column: auto;
  }

  .phase-plan-row {
    grid-template-columns: 30px minmax(0, 1fr) 92px;
  }

  .phase-assignee-select,
  .phase-time-range {
    grid-column: 2 / 4;
    width: 100%;
  }

  .phase-row-actions {
    grid-column: 3;
    grid-row: 1;
  }

  .progress-history-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .progress-history-operator {
    flex-basis: auto;
    max-width: 100%;
  }

  .progress-history-time {
    align-self: flex-end;
  }

  .progress-history-phase {
    max-width: 100%;
  }
}

.readonly-field {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.phase-progress-item {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-tertiary);
}

.phase-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.phase-progress-member {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.phase-progress-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.phase-progress-assignee,
.phase-progress-value {
  font-size: 12px;
  color: var(--color-text-muted);
}

.phase-progress-control {
  display: flex;
  align-items: center;
}

.phase-progress-control input[type="range"] {
  width: 100%;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.phase-progress-control input[type="range"]:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.member-selector {
  position: relative;
}

.member-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.member-trigger:hover {
  border-color: var(--color-primary);
}

.member-trigger-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-trigger-info span {
  font-size: 14px;
}

.member-trigger-arrow {
  transition: transform var(--transition-fast);
  color: var(--color-text-muted);
}

.member-trigger-arrow.open {
  transform: rotate(180deg);
}

.member-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  padding: 4px;
}

.member-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.member-option:hover {
  background-color: var(--color-bg-tertiary);
}

.member-option.selected {
  background-color: var(--color-primary);
  color: white;
}

.member-option span {
  font-size: 14px;
}

.reference-list,
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.reference-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reference-item .input {
  flex: 1;
}

.reference-item .select {
  width: 100px;
}

.comment-item {
  padding: 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  font-size: 14px;
}

.comment-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.spacer {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background-color: var(--color-bg-primary);
  z-index: 1;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.delete-error {
  font-size: 13px;
  color: var(--color-danger);
  margin-right: auto;
}

.btn-sm {
  padding: 4px 8px;
}

.history-empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px 0;
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}

.history-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background-color: var(--color-border);
}

.history-item {
  display: flex;
  gap: 12px;
  position: relative;
  padding: 8px 0;
}

.history-dot {
  position: absolute;
  left: -20px;
  top: 14px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--color-primary);
  border: 2px solid var(--color-bg-primary);
  z-index: 1;
}

.history-content {
  flex: 1;
  padding: 8px 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.history-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.history-operator {
  font-weight: 600;
  color: var(--color-primary);
}

.history-field {
  font-weight: 500;
}

.history-old {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.history-new {
  font-weight: 500;
  color: var(--color-success, #22c55e);
}

.history-time {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.progress-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-history-item {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-tertiary);
}

.progress-history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
}

.progress-history-operator {
  flex: 0 0 96px;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-history-time {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.progress-history-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  flex-wrap: wrap;
  min-width: 0;
}

.progress-history-phase {
  max-width: min(220px, 45%);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-history-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.progress-history-old,
.progress-history-new {
  min-width: 48px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: 13px;
  font-weight: 700;
}

.progress-history-old {
  background-color: #fee2e2;
  color: #b91c1c;
}

.progress-history-new {
  background-color: #dcfce7;
  color: #15803d;
}

.progress-history-arrow {
  color: var(--color-text-muted);
}

.progress-history-delta {
  padding: 3px 8px;
  border-radius: 999px;
  background-color: #dcfce7;
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
}

.progress-history-delta.negative {
  background-color: #fee2e2;
  color: #b91c1c;
}

.child-task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.child-empty {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.child-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.child-task-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.child-task-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
