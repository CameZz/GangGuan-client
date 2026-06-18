// Task store - manages task state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectPhaseTemplate, Task, TaskPhase, TaskStatus, TaskPriority, TaskHistory, TaskProgressHistory } from '@/types'
import { taskApi } from '@/api/tasks'
import { historyApi } from '@/api/histories'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'
import { useUserStore } from './user'
import { useProjectStore } from './project'
import {
  deriveStageFromPhase,
  deriveStatusFromPhases,
  getCurrentTaskPhase,
  getTaskPhaseProgress,
  getTaskStageLabel,
  getTaskStageValue,
  normalizeTaskPhases
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

  // 从 WebSocket sync:init 设置数据
  function setTasks(data: Task[]) {
    tasks.value = data
  }

  function clearData() {
    tasks.value = []
  }

  // Initialize tasks - 从 WebSocket sync:init 获取
  async function init() {
    // 数据会在 WebSocket sync:init 时设置
  }

  // 通过 REST API 拉取指定项目的任务（用于回退同步）
  async function fetchTasks(projectId: string): Promise<void> {
    try {
      const data = unwrapApiData<{ tasks: Task[] }>(await taskApi.getByProject(projectId) as any)
      if (data?.tasks) {
        const merged = [...tasks.value]
        for (const task of data.tasks) {
          const idx = merged.findIndex(t => t.id === task.id)
          if (idx !== -1) {
            merged[idx] = task
          } else {
            merged.push(task)
          }
        }
        tasks.value = merged
      }
    } catch (error) {
      console.error('获取任务列表失败:', error)
    }
  }

  async function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task | null> {
    try {
      const result = unwrapApiData<any>(await taskApi.create(data) as any)
      // 兼容多种响应格式：{ task } / 直接返回 task 对象
      const task: Task | null = result?.task || (result?.id ? result : null)
      if (task) {
        if (!tasks.value.find(t => t.id === task.id)) {
          tasks.value.push(task)
        }
        return task
      }
      console.warn('创建任务响应格式异常:', result)
      return null
    } catch (error) {
      console.error('创建任务失败:', error)
      return null
    }
  }

  async function updateTask(id: string, data: Partial<Task>, operatorId?: string): Promise<Task | null> {
    try {
      const result = unwrapApiData<any>(await taskApi.update(id, data) as any)
      // 兼容多种响应格式：{ task } / 直接返回 task 对象
      let task: Task | null = result?.task || (result?.id ? result : null)

      // 如果响应中没有任务数据，通过 GET 接口重新拉取
      if (!task) {
        console.warn('更新任务响应中无任务数据，尝试通过 GET 拉取:', result)
        try {
          const fresh = unwrapApiData<any>(await taskApi.getById(id) as any)
          task = fresh?.task || (fresh?.id ? fresh : null)
        } catch (fetchErr) {
          console.error('拉取更新后的任务失败:', fetchErr)
        }
      }

      if (task) {
        const index = tasks.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tasks.value[index] = task
        }
        return task
      }
      return null
    } catch (error) {
      console.error('更新任务失败:', error)
      return null
    }
  }

  async function deleteTask(id: string): Promise<boolean> {
    const task = tasks.value.find(t => t.id === id)
    if (task && isRequirement(task) && getChildTasks(id).length > 0) {
      return false
    }

    try {
      await taskApi.delete(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
      return true
    } catch (error) {
      console.error('删除任务失败:', error)
      return false
    }
  }

  async function moveTask(id: string, status: TaskStatus, operatorId?: string): Promise<Task | null> {
    try {
      const result = unwrapApiData<any>(await taskApi.move(id, status) as any)
      const task: Task | null = result?.task || (result?.id ? result : null)
      if (task) {
        const index = tasks.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tasks.value[index] = task
        }
        return task
      }
      return null
    } catch (error) {
      console.error('移动任务失败:', error)
      return null
    }
  }

  async function updateTaskPhaseProgress(taskId: string, phaseId: string, progress: number, operatorId?: string): Promise<Task | null> {
    try {
      const result = unwrapApiData<any>(await taskApi.updatePhaseProgress(taskId, phaseId, progress) as any)
      let task: Task | null = result?.task || (result?.id ? result : null)

      if (!task) {
        try {
          const fresh = unwrapApiData<any>(await taskApi.getById(taskId) as any)
          task = fresh?.task || (fresh?.id ? fresh : null)
        } catch (fetchErr) {
          console.error('拉取更新后的任务失败:', fetchErr)
        }
      }

      if (task) {
        const index = tasks.value.findIndex(t => t.id === taskId)
        if (index !== -1) {
          tasks.value[index] = task
        }
        return task
      }
      return null
    } catch (error) {
      console.error('更新阶段进度失败:', error)
      return null
    }
  }

  function canEditTaskPhaseProgress(phase: TaskPhase, userId?: string | null): boolean {
    const userStore = useUserStore()
    return userStore.isAdmin || (!!userId && phase.assigneeId === userId)
  }

  function isUserParticipating(task: Task, userId: string): boolean {
    return task.assigneeId === userId ||
      normalizeTaskPhases(task.phases).some(phase => phase.assigneeId === userId)
  }

  // 获取任务历史
  async function getTaskHistories(taskId: string): Promise<TaskHistory[]> {
    try {
      const data = unwrapApiData<{ histories: TaskHistory[] }>(await historyApi.getTaskHistories(taskId) as any)
      return data?.histories || []
    } catch (error) {
      console.error('获取任务历史失败:', error)
      return []
    }
  }

  // 获取任务进度历史
  async function getTaskProgressHistories(taskId: string): Promise<TaskProgressHistory[]> {
    try {
      const data = unwrapApiData<{ histories: TaskProgressHistory[] }>(await historyApi.getTaskProgressHistories(taskId) as any)
      return data?.histories || []
    } catch (error) {
      console.error('获取进度历史失败:', error)
      return []
    }
  }

  // 获取项目进度历史
  async function getProjectTaskProgressHistories(projectId: string): Promise<TaskProgressHistory[]> {
    try {
      const data = unwrapApiData<{ histories: TaskProgressHistory[] }>(await historyApi.getProjectProgressHistories(projectId) as any)
      return data?.histories || []
    } catch (error) {
      console.error('获取项目进度历史失败:', error)
      return []
    }
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

  // 监听 WebSocket 事件
  wsService.on('task:create', (task: Task) => {
    console.log('[WS] task:create received', task?.id, task?.title)
    if (!tasks.value.find(t => t.id === task.id)) {
      tasks.value.push(task)
    }
  })

  wsService.on('task:update', (task: Task) => {
    console.log('[WS] task:update received', task?.id)
    const index = tasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = task
    }
  })

  wsService.on('task:delete', ({ id }: { id: string }) => {
    console.log('[WS] task:delete received', id)
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
    setTasks,
    clearData,
    fetchTasks,
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
    getCurrentTaskPhase,
    getTaskPhaseProgress,
    getTaskStageLabel,
    getTaskStageValue,
    updateTaskPhaseProgress,
    canEditTaskPhaseProgress,
    isUserParticipating,
    getTaskHistories,
    getTaskProgressHistories,
    getProjectTaskProgressHistories,
    getTasksByFilters
  }
})
