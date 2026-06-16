// Project store - manages project state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ProjectPhaseTemplate } from '@/types'
import mockApi from '@/utils/mock'
import { createDefaultPhaseTemplates, normalizePhaseTemplates } from '@/utils/taskPhases'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const selectedPlanningId = ref<string | null>(null)
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
    // Only reset planning if project actually changed
    if (currentProjectId.value !== id) {
      currentProjectId.value = id
      selectedPlanningId.value = null
    }
  }

  function setSelectedPlanning(id: string | null) {
    selectedPlanningId.value = id
  }

  function clearSelectedPlanning() {
    selectedPlanningId.value = null
  }

  function createProject(data: Omit<Project, 'id' | 'createdAt'>) {
    const project = mockApi.createProject({
      ...data,
      phaseTemplates: normalizePhaseTemplates(data.phaseTemplates || createDefaultPhaseTemplates())
    })
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

  function getEnabledPhaseTemplates(projectId: string): ProjectPhaseTemplate[] {
    const project = projects.value.find(p => p.id === projectId)
    return normalizePhaseTemplates(project?.phaseTemplates)
      .filter(template => template.enabled)
  }

  function addPhaseTemplate(projectId: string, name: string) {
    const project = projects.value.find(p => p.id === projectId)
    const trimmedName = name.trim()
    if (!project || !trimmedName) return null
    const templates = normalizePhaseTemplates(project.phaseTemplates)
    const template: ProjectPhaseTemplate = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      order: templates.length,
      enabled: true
    }
    updateProject(projectId, { phaseTemplates: [...templates, template] })
    return template
  }

  function updatePhaseTemplate(projectId: string, templateId: string, data: Partial<ProjectPhaseTemplate>) {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return null
    const templates = normalizePhaseTemplates(project.phaseTemplates).map(template =>
      template.id === templateId
        ? {
            ...template,
            ...data,
            name: data.name !== undefined ? data.name.trim() || template.name : template.name
          }
        : template
    )
    return updateProject(projectId, { phaseTemplates: normalizePhaseTemplates(templates) })
  }

  function movePhaseTemplate(projectId: string, templateId: string, direction: 'up' | 'down') {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return null
    const templates = normalizePhaseTemplates(project.phaseTemplates)
    const index = templates.findIndex(template => template.id === templateId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= templates.length) return project
    const next = [...templates]
    const [template] = next.splice(index, 1)
    next.splice(targetIndex, 0, template)
    return updateProject(projectId, {
      phaseTemplates: next.map((item, order) => ({ ...item, order }))
    })
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
    selectedPlanningId,
    init,
    setCurrentProject,
    setSelectedPlanning,
    clearSelectedPlanning,
    createProject,
    updateProject,
    deleteProject,
    getEnabledPhaseTemplates,
    addPhaseTemplate,
    updatePhaseTemplate,
    movePhaseTemplate
  }
})
