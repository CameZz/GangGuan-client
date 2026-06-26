<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority, TaskStage, TaskPhase, Reference, Comment, RoleType, TaskHistory, TaskProgressHistory, TaskItemType, ProjectPhaseTemplate } from '@/types'
import { HISTORY_FIELD_LABELS, ROLES } from '@/types'
import { useMemberStore, usePlanningStore, useProjectStore, useTaskStore, useUserStore } from '@/stores'
import { createTaskPhaseFromTemplate, getPhaseStatus, getTaskPhaseProgress, getTaskStageLabel, normalizeTaskPhases } from '@/utils/taskPhases'
import {
  formatDateKey,
  formatDateLabel,
  generateWorkSlots,
  getWorkSlotGridRange,
  isWorkday as isScheduleWorkday,
  normalizePhaseDateTime,
  parseTimeToMinutes,
  validatePhaseTimeRange,
  WORK_SESSIONS,
  WORK_SLOT_MINUTES,
  WORK_SLOTS_PER_DAY
} from '@/utils/workingSchedule'
import MemberAvatar from '@/components/member/MemberAvatar.vue'

const props = defineProps<{
  task?: Task | null
  isOpen: boolean
  projectId?: string
  initialParentRequirementId?: string | null
  initialPlanningId?: string | null
  initialRequest?: {
    title: string
    description: string
    phases: TaskPhase[]
    projectId: string
    planningId?: string | null
    parentRequirementId?: string | null
  } | null
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

const members = computed(() => {
  const projectId = form.value.projectId || props.projectId
  if (projectId) {
    return projectStore.getProjectMemberUsers(projectId)
  }
  return memberStore.members
})
const plannings = computed(() => planningStore.plannings)

const PREVIEW_DAYS = 15

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
const scheduleError = ref('')
const selectedPhaseIndex = ref<number | null>(null)
const editingCommentIndex = ref<number | null>(null)
const newCommentContent = ref('')
const taskHistories = ref<TaskHistory[]>([])
const progressHistories = ref<TaskProgressHistory[]>([])

watch([() => props.isOpen, () => props.task, () => props.initialParentRequirementId, () => props.initialPlanningId, () => props.initialRequest], ([open]) => {
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
  } else if (open && props.initialRequest) {
    // 从申请数据预填
    taskHistories.value = []
    progressHistories.value = []
    form.value = {
      itemType: 'task',
      parentRequirementId: props.initialRequest.parentRequirementId || null,
      title: props.initialRequest.title,
      description: props.initialRequest.description,
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      assigneeId: null,
      stage: 'filed',
      phases: normalizeTaskPhases(props.initialRequest.phases),
      currentPhaseId: null,
      planningId: props.initialRequest.planningId || null,
      references: [],
      comments: [],
      projectId: props.initialRequest.projectId
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
    scheduleError.value = ''
    selectedPhaseIndex.value = null
    editingCommentIndex.value = null
    newCommentContent.value = ''
  }
}, { immediate: true })

const isEditing = computed(() => !!props.task)
const isRequirementItem = computed(() => form.value.itemType === 'requirement')
const isTaskItem = computed(() => form.value.itemType !== 'requirement')
const isChildTaskCreation = computed(() => !!props.initialParentRequirementId && !props.task)
const isProjectManager = computed(() => userStore.isAdmin || userStore.currentUser?.role === 'pm')
const canEditBasicInfo = computed(() => !isEditing.value || isProjectManager.value)

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
  if (!props.task) return ''
  if (isTaskItem.value && form.value.status === 'abandoned') {
    return '该任务单已是废弃状态'
  }
  if (isRequirementItem.value && childTasks.value.length > 0) {
    return `该需求单下还有 ${childTasks.value.length} 个任务单，请先移出子任务`
  }
  return ''
})

const deleteActionLabel = computed(() => {
  if (isTaskItem.value) return form.value.status === 'abandoned' ? '已废弃' : '废弃任务单'
  return '删除需求单'
})

const availableMembers = computed(() => {
  return members.value
})

const phaseTemplates = computed(() => {
  if (!form.value.projectId) return []
  return projectStore.getEnabledPhaseTemplates(form.value.projectId)
})

const sortedPhaseTemplates = computed(() => {
  return [...phaseTemplates.value].sort((a, b) => a.order - b.order)
})

const nextPhaseTemplateToAdd = computed(() => getNextPhaseTemplateToAdd())
const canAddTaskPhase = computed(() => !!nextPhaseTemplateToAdd.value)

const scheduleConfig = computed(() => {
  const project = projectStore.projects.find(project => project.id === form.value.projectId)
  return {
    nonWorkdays: project?.nonWorkdays || [],
    extraWorkdays: project?.extraWorkdays || []
  }
})

const phaseProgress = computed(() => getTaskPhaseProgress(form.value.phases))

interface SchedulePreviewDay {
  date: Date
  dateStr: string
  dayIndex: number
}

interface PhaseSchedulePreviewItem {
  key: string
  taskId: string
  taskTitle: string
  planningName: string
  phase: TaskPhase
  isDraft: boolean
  isCurrentPhase: boolean
}

const schedulePreviewStart = computed(() => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
})

const schedulePreviewEnd = computed(() => {
  const end = new Date(schedulePreviewStart.value)
  end.setDate(end.getDate() + PREVIEW_DAYS)
  return end
})

const schedulePreviewDays = computed<SchedulePreviewDay[]>(() => {
  const days: SchedulePreviewDay[] = []
  const current = new Date(schedulePreviewStart.value)

  for (let dayIndex = 0; dayIndex < PREVIEW_DAYS; dayIndex++) {
    days.push({
      date: new Date(current),
      dateStr: formatDateLabel(current),
      dayIndex
    })
    current.setDate(current.getDate() + 1)
  }

  return days
})

const visibleSchedulePreviewDays = computed(() => {
  return schedulePreviewDays.value.filter(day => isScheduleWorkday(day.date, scheduleConfig.value))
})

const schedulePreviewWorkSlots = computed(() => generateWorkSlots(visibleSchedulePreviewDays.value, scheduleConfig.value))

const schedulePreviewTotalSlots = computed(() => visibleSchedulePreviewDays.value.length * WORK_SLOTS_PER_DAY)

const schedulePreviewGridTemplateColumns = computed(() => {
  return schedulePreviewTotalSlots.value > 0
    ? `repeat(${schedulePreviewTotalSlots.value}, minmax(0, 1fr))`
    : '1fr'
})

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

function getPlanningName(planningId: string | null): string {
  if (!planningId) return '未分配迭代'
  return plannings.value.find(planning => planning.id === planningId)?.name || '未知迭代'
}

function getPhaseEndTime(phase: TaskPhase): Date | null {
  if (!phase.startTime || !phase.endTime) return null
  const end = normalizePhaseDateTime(phase.endTime, 'end')
  return end && !Number.isNaN(end.getTime()) ? end : null
}

function isPhaseInPreviewRange(phase: TaskPhase): boolean {
  const start = normalizePhaseDateTime(phase.startTime, 'start')
  const end = getPhaseEndTime(phase)
  if (!start || !end) return false
  return end.getTime() > schedulePreviewStart.value.getTime() &&
    start.getTime() < schedulePreviewEnd.value.getTime() &&
    getWorkSlotGridRange(phase.startTime, phase.endTime, schedulePreviewWorkSlots.value) !== null
}

function getPhaseSchedulePreviewItems(phaseIndex: number): PhaseSchedulePreviewItem[] {
  const selectedPhase = form.value.phases[phaseIndex]
  const assigneeId = selectedPhase?.assigneeId
  if (!assigneeId) return []

  const items: PhaseSchedulePreviewItem[] = []
  const currentTaskId = props.task?.id || 'draft-task'

  for (const task of taskStore.tasks) {
    if (!taskStore.isTaskItem(task)) continue
    if (task.projectId !== form.value.projectId) continue
    if (props.task?.id && task.id === props.task.id) continue

    for (const phase of task.phases || []) {
      if (phase.assigneeId !== assigneeId || !isPhaseInPreviewRange(phase)) continue
      items.push({
        key: `saved-${task.id}-${phase.id}`,
        taskId: task.id,
        taskTitle: task.title,
        planningName: getPlanningName(task.planningId),
        phase,
        isDraft: false,
        isCurrentPhase: false
      })
    }
  }

  form.value.phases.forEach((phase, index) => {
    if (phase.assigneeId !== assigneeId || !isPhaseInPreviewRange(phase)) return
    items.push({
      key: `draft-${currentTaskId}-${phase.id}-${index}`,
      taskId: currentTaskId,
      taskTitle: form.value.title || '当前任务',
      planningName: getPlanningName(form.value.planningId),
      phase,
      isDraft: true,
      isCurrentPhase: index === phaseIndex
    })
  })

  return items.sort((a, b) => {
    const aStart = a.phase.startTime ? new Date(a.phase.startTime).getTime() : Number.MAX_SAFE_INTEGER
    const bStart = b.phase.startTime ? new Date(b.phase.startTime).getTime() : Number.MAX_SAFE_INTEGER
    return aStart - bStart
  })
}

function isSchedulePreviewVisible(phaseIndex: number): boolean {
  return selectedPhaseIndex.value === phaseIndex && !!form.value.phases[phaseIndex]?.assigneeId
}

function getSchedulePreviewBarStyle(item: PhaseSchedulePreviewItem) {
  const range = getWorkSlotGridRange(item.phase.startTime, item.phase.endTime, schedulePreviewWorkSlots.value)
  if (!range) return { display: 'none' }
  return {
    gridColumn: `${range.start} / ${range.end}`
  }
}

function formatPhasePreviewDateTime(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSchedulePreviewTooltip(item: PhaseSchedulePreviewItem): string {
  return [
    `任务：${item.taskTitle}`,
    `阶段：${item.phase.name}`,
    `迭代：${item.planningName}`,
    `时间：${formatPhasePreviewDateTime(item.phase.startTime)} - ${formatPhasePreviewDateTime(item.phase.endTime)}`,
    `进度：${item.phase.progress}%`
  ].join('\n')
}

function handleSubmit() {
  // 服务端会在创建任务时自动生成阶段
  scheduleError.value = ''
  const phases = normalizeTaskPhases(form.value.phases).map(phase => ({
    ...phase,
    startTime: normalizePhaseDateTime(phase.startTime, 'start')?.toISOString() || null,
    endTime: normalizePhaseDateTime(phase.endTime, 'end')?.toISOString() || null
  }))
  if (isTaskItem.value) {
    for (const phase of phases) {
      const error = validatePhaseTimeRange(phase.startTime, phase.endTime, scheduleConfig.value)
      if (error) {
        scheduleError.value = `${phase.name}: ${error}`
        selectedPhaseIndex.value = form.value.phases.findIndex(item => item.id === phase.id)
        activeTab.value = 'main'
        return
      }
    }
  }

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
  scheduleError.value = ''
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
    selectedPhaseIndex.value = null
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
  const content = newCommentContent.value.trim()
  if (!content) return
  const authorId = userStore.currentUser?.id || members.value[0]?.id
  if (authorId) {
    form.value.comments.push({
      id: Date.now().toString(),
      authorId,
      content,
      createdAt: new Date().toISOString()
    })
    newCommentContent.value = ''
  }
}

function removeComment(index: number) {
  form.value.comments.splice(index, 1)
  if (editingCommentIndex.value === index) {
    editingCommentIndex.value = null
  } else if (editingCommentIndex.value !== null && editingCommentIndex.value > index) {
    editingCommentIndex.value--
  }
}

function startEditComment(index: number) {
  editingCommentIndex.value = index
}

function stopEditComment() {
  editingCommentIndex.value = null
}

function getMemberName(memberId: string): string {
  const member = members.value.find(m => m.id === memberId)
  return member?.name || '未分配'
}

async function loadHistories() {
  if (props.task?.id) {
    taskHistories.value = await taskStore.getTaskHistories(props.task.id)
    progressHistories.value = await taskStore.getTaskProgressHistories(props.task.id)
  } else {
    taskHistories.value = []
    progressHistories.value = []
  }
}

interface WorkTimeOption {
  value: string
  label: string
}

function formatMinutesAsTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function buildWorkTimeOptions(boundary: 'start' | 'end'): WorkTimeOption[] {
  const options: WorkTimeOption[] = []
  for (const session of WORK_SESSIONS) {
    const start = parseTimeToMinutes(session.start)
    const end = parseTimeToMinutes(session.end)
    const first = boundary === 'start' ? start : start + WORK_SLOT_MINUTES
    const last = boundary === 'start' ? end - WORK_SLOT_MINUTES : end
    for (let minutes = first; minutes <= last; minutes += WORK_SLOT_MINUTES) {
      const value = formatMinutesAsTime(minutes)
      options.push({ value, label: value })
    }
  }
  return options
}

const phaseStartTimeOptions = buildWorkTimeOptions('start')
const phaseEndTimeOptions = buildWorkTimeOptions('end')

function getNextPhaseTemplateToAdd(): ProjectPhaseTemplate | null {
  const templates = sortedPhaseTemplates.value
  if (templates.length === 0) return null
  if (form.value.phases.length === 0) return templates[0]

  const usedTemplateIds = new Set(form.value.phases.map(phase => phase.templateId))
  const lastPhase = form.value.phases[form.value.phases.length - 1]
  const lastTemplateIndex = templates.findIndex(template => template.id === lastPhase.templateId)

  if (lastTemplateIndex >= 0) {
    const nextTemplate = templates.slice(lastTemplateIndex + 1).find(template => !usedTemplateIds.has(template.id))
    if (nextTemplate) return nextTemplate
  }

  return templates.find(template => !usedTemplateIds.has(template.id)) || null
}

function isPhaseTemplateUsedByOtherRow(templateId: string, phaseIndex: number): boolean {
  return form.value.phases.some((phase, index) => index !== phaseIndex && phase.templateId === templateId)
}

function getPhaseTemplateOptions() {
  return sortedPhaseTemplates.value
}

function createScheduleDaySlots(from: Date, days = 45) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Array.from({ length: days }, (_, dayIndex) => {
    const date = new Date(start)
    date.setDate(start.getDate() + dayIndex)
    return { date, dayIndex }
  })
}

function findNextWorkSlot(after: Date) {
  const slots = generateWorkSlots(createScheduleDaySlots(after), scheduleConfig.value)
  return slots.find(slot => slot.start.getTime() >= after.getTime()) || null
}

function getDefaultPhaseSchedule() {
  const previousPhase = form.value.phases[form.value.phases.length - 1]
  const previousEnd = previousPhase ? normalizePhaseDateTime(previousPhase.endTime, 'end') : null
  const searchFrom = previousEnd ? new Date(previousEnd.getTime() + 1) : new Date()
  const slot = findNextWorkSlot(searchFrom)
  if (!slot) return null
  // 默认结束时间为当天最后一个工作时段的结束时间（18:30）
  const dayEnd = new Date(slot.date)
  const lastSessionEnd = WORK_SESSIONS[WORK_SESSIONS.length - 1].end
  const [endHour, endMinute] = lastSessionEnd.split(':').map(Number)
  dayEnd.setHours(endHour, endMinute, 0, 0)
  const endTime = slot.start.getTime() >= dayEnd.getTime()
    ? slot.end.toISOString()
    : dayEnd.toISOString()
  return {
    startTime: slot.start.toISOString(),
    endTime
  }
}

function updateDueDateFromPhases() {
  if (!form.value.phases.length) return
  let latestEnd: Date | null = null
  for (const phase of form.value.phases) {
    const end = normalizePhaseDateTime(phase.endTime, 'end')
    if (end && (!latestEnd || end.getTime() > latestEnd.getTime())) {
      latestEnd = end
    }
  }
  if (latestEnd) {
    form.value.dueDate = formatDateKey(latestEnd)
  }
}

function addTaskPhase() {
  const template = nextPhaseTemplateToAdd.value
  if (!template) return
  const phase = createTaskPhaseFromTemplate(template, form.value.phases.length)
  const schedule = getDefaultPhaseSchedule()
  if (schedule) {
    phase.startTime = schedule.startTime
    phase.endTime = schedule.endTime
  }
  form.value.phases.push(phase)
  selectedPhaseIndex.value = form.value.phases.length - 1
  updateDueDateFromPhases()
}

function updateTaskPhaseTemplate(index: number, templateId: string) {
  const template = sortedPhaseTemplates.value.find(item => item.id === templateId)
  if (!template || isPhaseTemplateUsedByOtherRow(template.id, index)) return
  selectedPhaseIndex.value = index
  form.value.phases[index] = {
    ...form.value.phases[index],
    templateId: template.id,
    name: template.name
  }
}

function removeTaskPhase(index: number) {
  form.value.phases.splice(index, 1)
  if (selectedPhaseIndex.value === index) {
    selectedPhaseIndex.value = null
  } else if (selectedPhaseIndex.value !== null && selectedPhaseIndex.value > index) {
    selectedPhaseIndex.value--
  }
  reorderTaskPhases()
  updateDueDateFromPhases()
}

function moveTaskPhase(index: number, direction: 'up' | 'down') {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= form.value.phases.length) return
  const [phase] = form.value.phases.splice(index, 1)
  form.value.phases.splice(targetIndex, 0, phase)
  if (selectedPhaseIndex.value === index) {
    selectedPhaseIndex.value = targetIndex
  } else if (selectedPhaseIndex.value === targetIndex) {
    selectedPhaseIndex.value = index
  }
  reorderTaskPhases()
}

function reorderTaskPhases() {
  form.value.phases = form.value.phases.map((phase, order) => ({ ...phase, order }))
}

function updateTaskPhaseAssignee(index: number, assigneeId: string) {
  selectedPhaseIndex.value = index
  form.value.phases[index].assigneeId = assigneeId || null
}

function getPhaseDateInputValue(value: string | null, boundary: 'start' | 'end'): string {
  const date = normalizePhaseDateTime(value, boundary)
  return date ? formatDateKey(date) : ''
}

function getPhaseTimeInputValue(value: string | null, boundary: 'start' | 'end'): string {
  const date = normalizePhaseDateTime(value, boundary)
  return date ? formatMinutesAsTime(date.getHours() * 60 + date.getMinutes()) : ''
}

function getDefaultDateValue(): string {
  const slot = findNextWorkSlot(new Date())
  return formatDateKey(slot?.start || new Date())
}

function getDefaultBoundaryTime(boundary: 'start' | 'end'): string {
  return boundary === 'start' ? phaseStartTimeOptions[0]?.value || '09:30' : phaseEndTimeOptions[phaseEndTimeOptions.length - 1]?.value || '18:30'
}

function updateTaskPhaseScheduleValue(index: number, boundary: 'start' | 'end', dateValue: string, timeValue: string) {
  selectedPhaseIndex.value = index
  form.value.phases[index][boundary === 'start' ? 'startTime' : 'endTime'] = dateValue && timeValue
    ? new Date(`${dateValue}T${timeValue}`).toISOString()
    : null
  updateDueDateFromPhases()
}

function updateTaskPhaseScheduleDate(index: number, boundary: 'start' | 'end', dateValue: string) {
  const phase = form.value.phases[index]
  const currentValue = boundary === 'start' ? phase.startTime : phase.endTime
  const timeValue = getPhaseTimeInputValue(currentValue, boundary) || getDefaultBoundaryTime(boundary)
  updateTaskPhaseScheduleValue(index, boundary, dateValue, timeValue)
}

function updateTaskPhaseScheduleTime(index: number, boundary: 'start' | 'end', timeValue: string) {
  const phase = form.value.phases[index]
  const currentValue = boundary === 'start' ? phase.startTime : phase.endTime
  const dateValue = getPhaseDateInputValue(currentValue, boundary) || getDefaultDateValue()
  updateTaskPhaseScheduleValue(index, boundary, dateValue, timeValue)
}

function getPhaseScheduleError(index: number): string | null {
  const phase = form.value.phases[index]
  if (!phase) return null
  return validatePhaseTimeRange(phase.startTime, phase.endTime, scheduleConfig.value)
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
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title-row">
          <h2 class="modal-title">{{ isEditing ? (isRequirementItem ? '编辑需求单' : '编辑任务单') : '新建单据' }}<span v-if="isEditing && !canEditBasicInfo" class="readonly-badge">只读</span></h2>
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
              :disabled="!canEditBasicInfo"
            />
          </div>
          <div class="form-group">
            <label class="label">描述</label>
            <textarea
              v-model="form.description"
              class="input textarea"
              placeholder="输入任务描述"
              :disabled="!canEditBasicInfo"
            ></textarea>
          </div>
          <div class="form-row task-meta-row" :class="{ 'task-meta-row--task': isTaskItem }">
            <div v-if="isTaskItem" class="form-group">
              <label class="label">状态</label>
              <select v-model="form.status" class="input select" :disabled="!canEditBasicInfo">
                <option value="todo">待办</option>
                <option value="in-progress">进行中</option>
                <option value="done">已完成</option>
                <option value="abandoned">已废弃</option>
              </select>
            </div>
            <div class="form-group">
              <label class="label">优先级</label>
              <select v-model="form.priority" class="input select" :disabled="!canEditBasicInfo">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div v-if="isTaskItem" class="form-group">
              <label class="label">所属需求</label>
              <select v-model="form.parentRequirementId" class="input select" :disabled="!canEditBasicInfo">
                <option :value="null">不归属需求单</option>
                <option v-for="requirement in requirementOptions" :key="requirement.id" :value="requirement.id">
                  {{ requirement.title }}
                </option>
              </select>
            </div>
          </div>
          <div v-if="isEditing" class="form-group">
            <label class="label">规划</label>
            <select v-model="form.planningId" class="input select" :disabled="!canEditBasicInfo">
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
                <button v-if="canEditBasicInfo" class="btn btn-primary btn-sm phase-add-button" :disabled="!canAddTaskPhase" @click="addTaskPhase">+ 添加阶段</button>
                <span v-if="canEditBasicInfo && !canAddTaskPhase" class="phase-add-hint">暂无可添加阶段</span>
              </div>
              <div class="phase-plan-list">
                <div
                  v-for="(phase, index) in form.phases"
                  :key="phase.id"
                  class="phase-plan-row"
                  :class="{ selected: selectedPhaseIndex === index }"
                  @click="selectedPhaseIndex = index"
                >
                  <div class="phase-order">{{ index + 1 }}</div>
                  <div class="phase-main">
                    <select
                      :value="phase.templateId"
                      class="input select phase-template-select"
                      :disabled="!canEditBasicInfo"
                      @focus="selectedPhaseIndex = index"
                      @change="updateTaskPhaseTemplate(index, ($event.target as HTMLSelectElement).value)"
                    >
                      <option
                        v-for="template in getPhaseTemplateOptions()"
                        :key="template.id"
                        :value="template.id"
                        :disabled="isPhaseTemplateUsedByOtherRow(template.id, index)"
                      >
                        {{ template.name }}
                      </option>
                    </select>
                    <div class="phase-progress-text">{{ phase.progress }}%</div>
                  </div>
                  <select
                    :value="phase.assigneeId || ''"
                    class="input select phase-assignee-select"
                    :disabled="!canEditBasicInfo"
                    @focus="selectedPhaseIndex = index"
                    @change="updateTaskPhaseAssignee(index, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">选择执行者</option>
                    <option v-for="member in availableMembers" :key="member.id" :value="member.id">
                      {{ member.name }}
                    </option>
                  </select>
                  <div class="phase-time-range">
                    <div class="phase-time-group">
                      <input
                        type="date"
                        class="input phase-date-input"
                        :value="getPhaseDateInputValue(phase.startTime, 'start')"
                        :disabled="!canEditBasicInfo"
                        @focus="selectedPhaseIndex = index"
                        @change="updateTaskPhaseScheduleDate(index, 'start', ($event.target as HTMLInputElement).value)"
                      />
                      <select
                        class="input select phase-time-select"
                        :value="getPhaseTimeInputValue(phase.startTime, 'start')"
                        :disabled="!canEditBasicInfo"
                        @focus="selectedPhaseIndex = index"
                        @change="updateTaskPhaseScheduleTime(index, 'start', ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="">开始</option>
                        <option v-for="option in phaseStartTimeOptions" :key="`start-${option.value}`" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                    </div>
                    <span class="time-separator">至</span>
                    <div class="phase-time-group">
                      <input
                        type="date"
                        class="input phase-date-input"
                        :value="getPhaseDateInputValue(phase.endTime, 'end')"
                        :disabled="!canEditBasicInfo"
                        @focus="selectedPhaseIndex = index"
                        @change="updateTaskPhaseScheduleDate(index, 'end', ($event.target as HTMLInputElement).value)"
                      />
                      <select
                        class="input select phase-time-select"
                        :value="getPhaseTimeInputValue(phase.endTime, 'end')"
                        :disabled="!canEditBasicInfo"
                        @focus="selectedPhaseIndex = index"
                        @change="updateTaskPhaseScheduleTime(index, 'end', ($event.target as HTMLSelectElement).value)"
                      >
                        <option value="">结束</option>
                        <option v-for="option in phaseEndTimeOptions" :key="`end-${option.value}`" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div v-if="getPhaseScheduleError(index)" class="phase-row-error">{{ getPhaseScheduleError(index) }}</div>
                  <div v-if="canEditBasicInfo" class="phase-row-actions">
                    <button
                      class="btn btn-ghost phase-icon-button"
                      :disabled="index === 0"
                      title="上移"
                      aria-label="上移阶段"
                      @click.stop="moveTaskPhase(index, 'up')"
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
                      @click.stop="moveTaskPhase(index, 'down')"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M19 12l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      class="btn btn-ghost phase-icon-button danger"
                      title="删除"
                      aria-label="删除阶段"
                      @click.stop="removeTaskPhase(index)"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                      </svg>
                    </button>
                  </div>
                  <div v-if="isSchedulePreviewVisible(index)" class="phase-schedule-preview">
                    <template v-if="getPhaseSchedulePreviewItems(index).length > 0">
                      <div class="phase-schedule-scroll">
                        <div
                          class="phase-schedule-dates"
                          :style="{
                            gridTemplateColumns: schedulePreviewGridTemplateColumns
                          }"
                        >
                          <div
                            v-for="(day, dayIndex) in visibleSchedulePreviewDays"
                            :key="day.dayIndex"
                            class="phase-schedule-date"
                            :style="{ gridColumn: `${dayIndex * WORK_SLOTS_PER_DAY + 1} / ${(dayIndex + 1) * WORK_SLOTS_PER_DAY + 1}` }"
                          >
                            {{ day.dateStr }}
                          </div>
                        </div>
                        <div
                          class="phase-schedule-grid"
                          :style="{
                            gridTemplateColumns: schedulePreviewGridTemplateColumns
                          }"
                        >
                          <div
                            v-for="(day, dayIndex) in visibleSchedulePreviewDays"
                            :key="`cell-${day.dayIndex}`"
                            class="phase-schedule-cell"
                            :style="{ gridColumn: `${dayIndex * WORK_SLOTS_PER_DAY + 1} / ${(dayIndex + 1) * WORK_SLOTS_PER_DAY + 1}` }"
                          ></div>
                          <div
                            v-for="item in getPhaseSchedulePreviewItems(index)"
                            :key="item.key"
                            class="phase-schedule-bar"
                            :class="{ draft: item.isDraft, current: item.isCurrentPhase }"
                            :style="getSchedulePreviewBarStyle(item)"
                            :title="getSchedulePreviewTooltip(item)"
                          >
                            <span class="phase-schedule-bar-label">{{ item.taskTitle }} / {{ item.phase.name }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <div v-else class="phase-schedule-empty">未来两周暂无排期</div>
                  </div>
                </div>
                <div v-if="form.phases.length === 0" class="phase-empty">暂无阶段</div>
              </div>
            </div>
          </div>
          <div v-if="isTaskItem" class="form-row">
            <div class="form-group">
              <label class="label">截止日期</label>
              <input v-model="form.dueDate" type="date" class="input" :disabled="!canEditBasicInfo" />
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
          <button v-if="props.task?.id && canEditBasicInfo" class="btn btn-secondary" @click="emit('createChild', props.task.id)">
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
                <div class="phase-progress-value-input">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    :value="phase.progress"
                    :disabled="!canEditPhaseProgress(phase)"
                    @input="updateTaskPhaseProgress(index, Number(($event.target as HTMLInputElement).value))"
                    @blur="($event.target as HTMLInputElement).value = String(phase.progress)"
                  />
                  <span>%</span>
                </div>
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
              <template v-if="editingCommentIndex === index">
                <div class="comment-line1">
                  <span class="comment-author">{{ getMemberName(comment.authorId) }}：</span>
                  <textarea
                    ref="commentEditTextarea"
                    v-model="comment.content"
                    class="input textarea comment-edit-textarea"
                    placeholder="输入评论内容"
                  ></textarea>
                </div>
                <div class="comment-line2">
                  <span></span>
                  <div class="comment-actions">
                    <button class="btn btn-ghost btn-sm" @click="stopEditComment">完成</button>
                    <span class="comment-date">{{ new Date(comment.createdAt).toLocaleString('zh-CN') }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="comment-line1">
                  <span class="comment-author">{{ getMemberName(comment.authorId) }}：</span>
                  <span class="comment-content">{{ comment.content || '暂无内容' }}</span>
                </div>
                <div class="comment-line2">
                  <span></span>
                  <div class="comment-actions">
                    <button class="btn btn-ghost btn-sm comment-action-btn" @click="removeComment(index)">删除</button>
                    <button class="btn btn-ghost btn-sm comment-action-btn" @click="startEditComment(index)">编辑</button>
                    <span class="comment-date">{{ new Date(comment.createdAt).toLocaleString('zh-CN') }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div class="comment-add-row">
            <input
              v-model="newCommentContent"
              type="text"
              class="input"
              placeholder="输入评论内容"
              @keyup.enter="addComment"
            />
            <button class="btn btn-primary btn-sm" :disabled="!newCommentContent.trim()" @click="addComment">添加</button>
          </div>
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
        <div v-if="deleteError || scheduleError" class="delete-error">{{ deleteError || scheduleError }}</div>
        <button v-if="isEditing && canEditBasicInfo" class="btn btn-danger" :disabled="!!deleteBlockedReason" @click="handleDelete">{{ deleteActionLabel }}</button>
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
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.phase-add-button {
  margin-left: auto;
  padding: 5px 14px;
  font-size: 13px;
  font-weight: 600;
}

.phase-add-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.phase-plan-list,
.phase-progress-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-plan-row {
  display: grid;
  grid-template-columns: 30px minmax(150px, 1fr) 132px minmax(360px, 420px) 92px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
}

.phase-plan-row.selected {
  border-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 6%, var(--color-bg-primary));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
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

.phase-template-select {
  width: 100%;
  min-width: 0;
  padding-left: 8px;
  padding-right: 24px;
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

.phase-time-group {
  display: grid;
  grid-template-columns: minmax(118px, 1fr) 72px;
  gap: 4px;
  min-width: 0;
}

.phase-date-input,
.phase-time-select {
  width: 100%;
  min-width: 0;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 12px;
}

.phase-time-select {
  padding-right: 22px;
}

.phase-row-error {
  grid-column: 4 / -1;
  margin-top: -2px;
  font-size: 12px;
  color: var(--color-error);
}

.time-separator {
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}

.phase-schedule-preview {
  grid-column: 1 / -1;
  min-width: 0;
  margin-top: 2px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-secondary);
}

.phase-schedule-scroll {
  overflow-x: hidden;
  overflow-y: hidden;
}

.phase-schedule-dates,
.phase-schedule-grid {
  display: grid;
}

.phase-schedule-date {
  min-width: 0;
  padding: 2px 1px 4px;
  border-right: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 9px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.phase-schedule-grid {
  position: relative;
  grid-template-rows: 30px;
  align-items: center;
  min-height: 34px;
}

.phase-schedule-cell {
  grid-row: 1;
  min-height: 30px;
  border-right: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
}

.phase-schedule-cell:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}

.phase-schedule-bar {
  grid-row: 1;
  z-index: 1;
  min-width: 0;
  height: 22px;
  margin: 4px 1px;
  padding: 0 3px;
  border-radius: var(--radius-sm);
  border: 1px solid #0f766e;
  background-color: #14b8a6;
  color: #fff;
  display: flex;
  align-items: center;
  overflow: hidden;
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
}

.phase-schedule-bar.draft {
  border-color: #2563eb;
  background-color: #3b82f6;
}

.phase-schedule-bar.current {
  border-color: #f59e0b;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.phase-schedule-bar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phase-schedule-empty {
  padding: 8px 10px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
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

  .phase-time-range,
  .phase-row-error {
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
  .phase-time-range,
  .phase-row-error {
    grid-column: 2 / 4;
    width: 100%;
  }

  .phase-time-range {
    grid-template-columns: 1fr;
  }

  .time-separator {
    display: none;
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

.phase-progress-assignee {
  font-size: 12px;
  color: var(--color-text-muted);
}

.phase-progress-value-input {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.phase-progress-value-input input[type="number"] {
  width: 48px;
  padding: 2px 4px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  text-align: right;
  font-size: 13px;
  background: var(--color-bg);
  color: var(--color-text);
  -moz-appearance: textfield;
}

.phase-progress-value-input input[type="number"]::-webkit-inner-spin-button,
.phase-progress-value-input input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.phase-progress-value-input input[type="number"]:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.phase-progress-value-input input[type="number"]:focus {
  outline: none;
  border-color: var(--color-primary);
}

.phase-progress-value-input span {
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

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
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
  padding: 8px 10px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.comment-line1 {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 13px;
  line-height: 1.5;
}

.comment-author {
  font-weight: 600;
  flex-shrink: 0;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.comment-content {
  color: var(--color-text-primary);
  word-break: break-word;
}

.comment-edit-textarea {
  flex: 1;
  min-height: 48px;
}

.comment-line2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comment-action-btn {
  font-size: 12px;
  padding: 2px 6px;
}

.comment-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.comment-add-row {
  display: flex;
  gap: 8px;
}

.comment-add-row .input {
  flex: 1;
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

.readonly-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  vertical-align: middle;
}
</style>














