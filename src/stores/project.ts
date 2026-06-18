// Project store - manages project state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ProjectPhaseTemplate } from '@/types'
import { projectApi } from '@/api/projects'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'

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

  function dedupeProjects(data: Project[]): Project[] {
    const order: string[] = []
    const byId = new Map<string, Project>()

    data.forEach(project => {
      if (!byId.has(project.id)) {
        order.push(project.id)
      }
      byId.set(project.id, project)
    })

    return order.map(id => byId.get(id)!)
  }

  function upsertProject(project: Project) {
    let replaced = false
    const next: Project[] = []

    projects.value.forEach(item => {
      if (item.id !== project.id) {
        next.push(item)
        return
      }

      if (!replaced) {
        next.push(project)
        replaced = true
      }
    })

    if (!replaced) {
      next.push(project)
    }

    projects.value = next
  }

  // Initialize projects from API
  async function init() {
    isLoading.value = true
    try {
      const data = unwrapApiData<{ projects: Project[] }>(await projectApi.getAll() as any)
      projects.value = dedupeProjects(data?.projects || [])
    } catch (error) {
      console.error('获取项目列表失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  function setProjects(data: Project[]) {
    projects.value = dedupeProjects(data)
  }

  function clearData() {
    projects.value = []
    currentProjectId.value = null
    selectedPlanningId.value = null
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

  async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project | null> {
    try {
      const result = unwrapApiData<{ project: Project }>(await projectApi.create(data) as any)
      if (result?.project) {
        const project = result.project
        upsertProject(project)
        return project
      }
      return null
    } catch (error) {
      console.error('创建项目失败:', error)
      return null
    }
  }

  async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    try {
      const result = unwrapApiData<{ project: Project }>(await projectApi.update(id, data) as any)
      if (result?.project) {
        const project = result.project
        upsertProject(project)
        return project
      }
      return null
    } catch (error) {
      console.error('更新项目失败:', error)
      return null
    }
  }

  function getEnabledPhaseTemplates(projectId: string): ProjectPhaseTemplate[] {
    const project = projects.value.find(p => p.id === projectId)
    return (project?.phaseTemplates || []).filter(template => template.enabled)
  }

  async function addPhaseTemplate(projectId: string, name: string): Promise<ProjectPhaseTemplate | null> {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    try {
      const data = unwrapApiData<{ template: ProjectPhaseTemplate }>(
        await projectApi.addPhaseTemplate(projectId, { name: trimmedName }) as any
      )

      if (data?.template) {
        await init()
        return data.template
      }
      return null
    } catch (error) {
      console.error('添加阶段模板失败:', error)
      return null
    }
  }

  async function updatePhaseTemplate(projectId: string, templateId: string, data: Partial<ProjectPhaseTemplate>): Promise<boolean> {
    try {
      await projectApi.updatePhaseTemplate(projectId, templateId, data)
      await init()
      return true
    } catch (error) {
      console.error('更新阶段模板失败:', error)
      return false
    }
  }

  async function movePhaseTemplate(projectId: string, templateId: string, direction: 'up' | 'down'): Promise<boolean> {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return false

    const templates = [...project.phaseTemplates]
    const index = templates.findIndex(t => t.id === templateId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (index < 0 || targetIndex < 0 || targetIndex >= templates.length) return false

    // 交换位置
    const temp = templates[index]
    templates[index] = templates[targetIndex]
    templates[targetIndex] = temp

    // 更新 order
    const templateIds = templates.map(t => t.id)

    try {
      await projectApi.reorderPhaseTemplates(projectId, templateIds)
      await init()
      return true
    } catch (error) {
      console.error('移动阶段模板失败:', error)
      return false
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    try {
      await projectApi.delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProjectId.value === id) {
        currentProjectId.value = null
      }
      return true
    } catch (error) {
      console.error('删除项目失败:', error)
      return false
    }
  }

  // 监听 WebSocket 事件
  wsService.on('project:create', (project: Project) => {
    upsertProject(project)
  })

  wsService.on('project:update', (project: Project) => {
    upsertProject(project)
  })

  wsService.on('project:delete', ({ id }: { id: string }) => {
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
    setProjects,
    clearData,
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
