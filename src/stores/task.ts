// Task store - manages task state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import mockApi from '@/utils/mock'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)

  // Computed properties
  const taskCount = computed(() => tasks.value.length)

  const todoTasks = computed(() => tasks.value.filter(t => t.status === 'todo'))
  const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in-progress'))
  const doneTasks = computed(() => tasks.value.filter(t => t.status === 'done'))

  const tasksByProject = (projectId: string) => {
    return computed(() => tasks.value.filter(t => t.projectId === projectId))
  }

  // Initialize tasks from mock API
  function init() {
    isLoading.value = true
    tasks.value = mockApi.getTasks()
    isLoading.value = false
  }

  function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const task = mockApi.createTask(data)
    tasks.value.push(task)
    return task
  }

  function updateTask(id: string, data: Partial<Task>) {
    const updated = mockApi.updateTask(id, data)
    if (updated) {
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updated
      }
    }
    return updated
  }

  function deleteTask(id: string) {
    const success = mockApi.deleteTask(id)
    if (success) {
      tasks.value = tasks.value.filter(t => t.id !== id)
    }
    return success
  }

  function moveTask(id: string, status: TaskStatus) {
    return updateTask(id, { status })
  }

  // Filter tasks
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
    getTasksByFilters
  }
})
