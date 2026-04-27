// Project store - manages project state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '@/types'
import mockApi from '@/utils/mock'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const isLoading = ref(false)

  const currentProject = computed(() => {
    if (!currentProjectId.value) return null
    return projects.value.find(p => p.id === currentProjectId.value) || null
  })

  const projectCount = computed(() => projects.value.length)

  // Initialize projects from mock API
  function init() {
    isLoading.value = true
    projects.value = mockApi.getProjects()
    isLoading.value = false
  }

  function setCurrentProject(id: string | null) {
    currentProjectId.value = id
  }

  function createProject(data: Omit<Project, 'id' | 'createdAt'>) {
    const project = mockApi.createProject(data)
    projects.value.push(project)
    return project
  }

  function updateProject(id: string, data: Partial<Project>) {
    const updated = mockApi.updateProject(id, data)
    if (updated) {
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1) {
        projects.value[index] = updated
      }
    }
    return updated
  }

  function deleteProject(id: string) {
    const success = mockApi.deleteProject(id)
    if (success) {
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProjectId.value === id) {
        currentProjectId.value = null
      }
    }
    return success
  }

  // Listen for mock events
  mockApi.on('project:create', (project: Project) => {
    if (!projects.value.find(p => p.id === project.id)) {
      projects.value.push(project)
    }
  })

  mockApi.on('project:update', (project: Project) => {
    const index = projects.value.findIndex(p => p.id === project.id)
    if (index !== -1) {
      projects.value[index] = project
    }
  })

  mockApi.on('project:delete', ({ id }: { id: string }) => {
    projects.value = projects.value.filter(p => p.id !== id)
  })

  return {
    projects,
    currentProjectId,
    currentProject,
    projectCount,
    isLoading,
    init,
    setCurrentProject,
    createProject,
    updateProject,
    deleteProject
  }
})
