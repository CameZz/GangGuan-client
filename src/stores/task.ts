// Task store - manages task state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectPhaseTemplate, Task, TaskPhase, TaskStatus, TaskPriority, TaskHistory } from '@/types'
import { formatHistoryValue } from '@/types'
import mockApi from '@/utils/mock'
import { useUserStore } from './user'
import { useMemberStore } from './member'
import { useProjectStore } from './project'
import {
  createTaskPhaseFromTemplate,
  deriveStageFromPhase,
  deriveStatusFromPhases,
  getCurrentTaskPhase,
  getTaskPhaseProgress,
  getTaskStageLabel,
  getTaskStageValue,
  normalizeTaskPhases,
  summarizeTaskPhases
} from '@/utils/taskPhases'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)

  // Computed properties
  const taskItems = computed(() => tasks.value.filter(isTaskItem))
  const requirementItems = computed(() => tasks.value.filter(isRequirement))

  const taskCount = computed(() => taskItems.value.length)

  const todoTasks = computed(() => taskItems.value.filter(t => t.status === 'todo'))
  const inProgressTasks = computed(() => taskItems.value.filter(t => t.status === 'in-progress'))
  const doneTasks = computed(() => taskItems.value.filter(t => t.status === 'done'))
  const abandonedTasks = computed(() => taskItems.value.filter(t => t.status === 'abandoned'))

  const tasksByProject = (projectId: string) => {
    return computed(() => tasks.value.filter(t => t.projectId === projectId))
  }

  function isRequirement(task: Task): boolean {
    return task.itemType === 'requirement'
  }

  function isTaskItem(task: Task): boolean {
    return task.itemType !== 'requirement'
  }

  function isStandaloneTask(task: Task): boolean {
    return isTaskItem(task) && !task.parentRequirementId
  }

  function getRequirementsByProject(projectId: string): Task[] {
    return tasks.value.filter(t => isRequirement(t) && t.projectId === projectId)
  }

  function getChildTasks(requirementId: string): Task[] {
    return tasks.value.filter(t => isTaskItem(t) && t.parentRequirementId === requirementId)
  }

  function getRequirementProgress(requirementId: string): { done: number; total: number } {
    const children = getChildTasks(requirementId)
    return {
      done: children.filter(t => t.status === 'done').length,
      total: children.length
    }
  }

  function getEnabledPhaseTemplates(projectId: string): ProjectPhaseTemplate[] {
    const projectStore = useProjectStore()
    return projectStore.getEnabledPhaseTemplates(projectId)
  }

  function buildTaskPhasesFromTemplates(
    projectId: string,
    templateIds?: string[],
    existingPhases: TaskPhase[] = []
  ): TaskPhase[] {
    const templates = getEnabledPhaseTemplates(projectId)
    const existingByTemplateId = new Map(existingPhases.map(phase => [phase.templateId, phase]))
    const selectedTemplates = (templateIds && templateIds.length > 0)
      ? templateIds
        .map(templateId => templates.find(template => template.id === templateId))
        .filter((template): template is ProjectPhaseTemplate => !!template)
      : templates
    return selectedTemplates.map((template, index) => {
      const existing = existingByTemplateId.get(template.id)
      if (existing) {
        return {
          ...existing,
          name: existing.name || template.name,
          order: index
        }
      }
      return createTaskPhaseFromTemplate(template, index)
    })
  }

  function deriveExecutionFields(
    task: Partial<Task>,
    existing?: Task
  ): Pick<Task, 'stage' | 'assigneeId' | 'status' | 'phases' | 'currentPhaseId'> {
    const statusInput = task.status || existing?.status || 'todo'
    let phases = normalizeTaskPhases(task.phases || existing?.phases || [])

    if (task.status === 'done') {
      phases = phases.map(phase => ({ ...phase, progress: 100, status: 'done' }))
    } else if (task.status === 'todo') {
      phases = phases.map(phase => ({ ...phase, progress: 0, status: 'pending' }))
    } else if (task.status === 'in-progress' && phases.length > 0 && phases.every(phase => phase.progress === 0)) {
      phases = phases.map((phase, index) => index === 0 ? { ...phase, progress: 1, status: 'in-progress' } : phase)
    }

    phases = normalizeTaskPhases(phases)
    const currentPhase = getCurrentTaskPhase(phases)
    return {
      phases,
      currentPhaseId: currentPhase?.id || null,
      stage: deriveStageFromPhase(currentPhase, task.stage || existing?.stage || 'filed'),
      assigneeId: currentPhase?.assigneeId || task.assigneeId || existing?.assigneeId || null,
      status: deriveStatusFromPhases(phases, statusInput)
    }
  }

  function updateTaskPhaseProgress(taskId: string, phaseId: string, progress: number, operatorId?: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || isRequirement(task)) return null
    const phases = normalizeTaskPhases(task.phases).map(phase =>
      phase.id === phaseId
        ? { ...phase, progress }
        : phase
    )
    return updateTask(taskId, { phases }, operatorId)
  }

  function canEditTaskPhaseProgress(phase: TaskPhase, userId?: string | null): boolean {
    const userStore = useUserStore()
    return userStore.isAdmin || (!!userId && phase.assigneeId === userId)
  }

  function normalizeTaskData(data: Partial<Task>, existing?: Task): Partial<Task> {
    const itemType = data.itemType || existing?.itemType || 'task'
    if (itemType === 'requirement') {
      return {
        ...data,
        itemType,
        parentRequirementId: null,
        assigneeId: null,
        dueDate: null,
        participants: [],
        phases: [],
        currentPhaseId: null
      }
    }

    let parentRequirementId = data.parentRequirementId || null
    if (parentRequirementId) {
      const projectId = data.projectId || existing?.projectId
      const parent = tasks.value.find(t => t.id === parentRequirementId)
      if (!parent || !isRequirement(parent) || (projectId && parent.projectId !== projectId)) {
        parentRequirementId = null
      }
    }

    const projectId = data.projectId || existing?.projectId || ''
    const projectTemplates = getEnabledPhaseTemplates(projectId)
    const allowedTemplateIds = new Set(projectTemplates.map(template => template.id))
    let phases = normalizeTaskPhases(data.phases || existing?.phases || [])
      .filter(phase => allowedTemplateIds.has(phase.templateId) || existing?.phases?.some(existingPhase => existingPhase.id === phase.id))

    if (phases.length === 0 && projectTemplates.length > 0) {
      phases = buildTaskPhasesFromTemplates(projectId)
    }

    const executionFields = deriveExecutionFields({ ...data, phases }, existing)
    return {
      ...data,
      ...executionFields,
      itemType,
      parentRequirementId
    }
  }

  // Initialize tasks from mock API
  function init() {
    isLoading.value = true
    tasks.value = mockApi.getTasks()
    isLoading.value = false
  }

  function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const task = mockApi.createTask(normalizeTaskData(data) as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>)
    if (!tasks.value.find(t => t.id === task.id)) {
      tasks.value.push(task)
    }
    return task
  }

  const HISTORY_FIELDS = ['status', 'priority', 'stage', 'phases', 'assigneeId', 'dueDate', 'title', 'description'] as const

  function updateTask(id: string, data: Partial<Task>, operatorId?: string) {
    const oldTask = tasks.value.find(t => t.id === id)
    if (oldTask && operatorId) {
      const userStore = useUserStore()
      const memberStore = useMemberStore()
      const resolvedOperatorId = operatorId || userStore.currentUser?.id || ''
      for (const field of HISTORY_FIELDS) {
        if (data[field] === undefined) continue
        const oldVal = oldTask[field]
        const newVal = data[field]
        const oldStr = field === 'phases' ? JSON.stringify(oldVal ?? []) : String(oldVal ?? '')
        const newStr = field === 'phases' ? JSON.stringify(newVal ?? []) : String(newVal ?? '')
        if (oldStr === newStr) continue
        let displayOld = oldStr
        let displayNew = newStr
        if (field === 'assigneeId') {
          displayOld = oldVal ? (memberStore.getMemberById(oldVal as string)?.name || oldStr) : ''
          displayNew = newVal ? (memberStore.getMemberById(newVal as string)?.name || newStr) : ''
        } else if (field === 'phases') {
          displayOld = summarizeTaskPhases(oldVal as TaskPhase[])
          displayNew = summarizeTaskPhases(newVal as TaskPhase[])
        } else {
          displayOld = formatHistoryValue(field, oldStr)
          displayNew = formatHistoryValue(field, newStr)
        }
        mockApi.addTaskHistory({
          taskId: id,
          operatorId: resolvedOperatorId,
          field,
          oldValue: displayOld,
          newValue: displayNew
        })
      }
    }
    const updated = mockApi.updateTask(id, normalizeTaskData(data, oldTask))
    if (updated) {
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updated
      }
    }
    return updated
  }

  function deleteTask(id: string) {
    const task = tasks.value.find(t => t.id === id)
    if (task && isRequirement(task) && getChildTasks(id).length > 0) {
      return false
    }
    const success = mockApi.deleteTask(id)
    if (success) {
      tasks.value = tasks.value.filter(t => t.id !== id)
    }
    return success
  }

  function moveTask(id: string, status: TaskStatus, operatorId?: string) {
    return updateTask(id, { status }, operatorId)
  }

  function isUserParticipating(task: Task, userId: string): boolean {
    return task.assigneeId === userId ||
      task.participants.some(p => p.memberId === userId) ||
      normalizeTaskPhases(task.phases).some(phase => phase.assigneeId === userId)
  }

  // Filter tasks
  function getTaskHistories(taskId: string): TaskHistory[] {
    return mockApi.getTaskHistories(taskId)
  }

  function getTasksByFilters(filters: {
    projectId?: string
    status?: TaskStatus
    priority?: TaskPriority
    assigneeId?: string | null
  }) {
    return computed(() => {
      return tasks.value.filter(task => {
        if (filters.projectId && task.projectId !== filters.projectId) return false
        if (filters.status && task.status !== filters.status) return false
        if (filters.priority && task.priority !== filters.priority) return false
        if (filters.assigneeId !== undefined && task.assigneeId !== filters.assigneeId) return false
        return true
      })
    })
  }

  // Listen for mock events
  mockApi.on('task:create', (task: Task) => {
    if (!tasks.value.find(t => t.id === task.id)) {
      tasks.value.push(task)
    }
  })

  mockApi.on('task:update', (task: Task) => {
    const index = tasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = task
    }
  })

  mockApi.on('task:delete', ({ id }: { id: string }) => {
    tasks.value = tasks.value.filter(t => t.id !== id)
  })

  return {
    tasks,
    taskCount,
    taskItems,
    requirementItems,
    todoTasks,
    inProgressTasks,
    doneTasks,
    tasksByProject,
    isLoading,
    init,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    isRequirement,
    isTaskItem,
    isStandaloneTask,
    getRequirementsByProject,
    getChildTasks,
    getRequirementProgress,
    getEnabledPhaseTemplates,
    buildTaskPhasesFromTemplates,
    getCurrentTaskPhase,
    getTaskPhaseProgress,
    getTaskStageLabel,
    getTaskStageValue,
    updateTaskPhaseProgress,
    canEditTaskPhaseProgress,
    isUserParticipating,
    getTaskHistories,
    getTasksByFilters
  }
})
