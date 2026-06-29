// Project store - manages project state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ProjectMember, ProjectPhaseTemplate, User } from '@/types'
import { projectApi } from '@/api/projects'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'
import { WSMessageType } from '@/types'

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

  function normalizeProject(project: Project): Project {
    return {
      ...project,
      members: project.members || []
    }
  }

  function dedupeProjects(data: Project[]): Project[] {
    const order: string[] = []
    const byId = new Map<string, Project>()

    data.map(normalizeProject).forEach(project => {
      if (!byId.has(project.id)) order.push(project.id)
      byId.set(project.id, project)
    })

    return order.map(id => byId.get(id)!)
  }

  function upsertProject(project: Project) {
    const normalized = normalizeProject(project)
    let replaced = false
    const next: Project[] = []

    projects.value.forEach(item => {
      if (item.id !== normalized.id) {
        next.push(item)
        return
      }

      if (!replaced) {
        next.push(normalized)
        replaced = true
      }
    })

    if (!replaced) next.push(normalized)
    projects.value = next
  }

  function membersToProjectMembers(projectId: string, members: User[]): ProjectMember[] {
    return members.map(user => ({
      id: `${projectId}:${user.id}`,
      projectId,
      userId: user.id,
      createdAt: '',
      user
    }))
  }

  function setProjectMembers(projectId: string, members: User[]) {
    const project = projects.value.find(item => item.id === projectId)
    if (!project) return
    upsertProject({ ...project, members: membersToProjectMembers(projectId, members) })
  }

  async function init() {
    isLoading.value = true
    try {
      const data = unwrapApiData<{ projects: Project[] }>(await projectApi.getAll())
      projects.value = dedupeProjects(data?.projects || [])
    } catch (error) {
      console.error('Failed to list projects:', error)
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

  function getProjectMemberUsers(projectId: string | null | undefined): User[] {
    if (!projectId) return []
    const project = projects.value.find(p => p.id === projectId)
    return (project?.members || []).map(member => member.user).filter(Boolean)
  }

  function isProjectMember(projectId: string | null | undefined, userId: string | null | undefined): boolean {
    if (!projectId || !userId) return false
    return getProjectMemberUsers(projectId).some(member => member.id === userId)
  }

  function canOperateProject(projectId: string | null | undefined, user: User | null | undefined): boolean {
    if (!projectId || !user) return false
    return user.isAdmin || isProjectMember(projectId, user.id)
  }

  function canManageProject(projectId: string | null | undefined, user: User | null | undefined): boolean {
    if (!projectId || !user) return false
    return user.isAdmin || (user.role === 'pm' && isProjectMember(projectId, user.id))
  }

  async function fetchProjectMembers(projectId: string): Promise<User[]> {
    try {
      const data = unwrapApiData<{ members: User[] }>(await projectApi.getMembers(projectId))
      const members = data?.members || []
      setProjectMembers(projectId, members)
      return members
    } catch (error) {
      console.error('Failed to fetch project members:', error)
      return getProjectMemberUsers(projectId)
    }
  }

  async function updateProjectMembers(projectId: string, userIds: string[]): Promise<User[] | null> {
    try {
      const data = unwrapApiData<{ members: User[] }>(await projectApi.updateMembers(projectId, userIds))
      const members = data?.members || []
      setProjectMembers(projectId, members)
      return members
    } catch (error) {
      console.error('Failed to update project members:', error)
      return null
    }
  }

  async function fetchReviewerCandidates(projectId: string): Promise<User[]> {
    try {
      const data = unwrapApiData<{ reviewers: User[] }>(await projectApi.getReviewerCandidates(projectId))
      return data?.reviewers || []
    } catch (error) {
      console.error('Failed to fetch reviewer candidates:', error)
      return getProjectMemberUsers(projectId).filter(user => user.isAdmin || user.role === 'pm')
    }
  }

  async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project | null> {
    try {
      const result = unwrapApiData<{ project: Project }>(await projectApi.create(data))
      if (result?.project) {
        const project = result.project
        upsertProject(project)
        return project
      }
      return null
    } catch (error) {
      console.error('Failed to create project:', error)
      return null
    }
  }

  async function updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    try {
      const result = unwrapApiData<{ project: Project }>(await projectApi.update(id, data))
      if (result?.project) {
        const project = result.project
        upsertProject(project)
        return project
      }
      return null
    } catch (error) {
      console.error('Failed to update project:', error)
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
        await projectApi.addPhaseTemplate(projectId, { name: trimmedName })
      )

      if (data?.template) {
        await init()
        return data.template
      }
      return null
    } catch (error) {
      console.error('Failed to add phase template:', error)
      return null
    }
  }

  async function updatePhaseTemplate(projectId: string, templateId: string, data: Partial<ProjectPhaseTemplate>): Promise<boolean> {
    try {
      await projectApi.updatePhaseTemplate(projectId, templateId, data)
      await init()
      return true
    } catch (error) {
      console.error('Failed to update phase template:', error)
      return false
    }
  }

  async function reorderPhaseTemplates(projectId: string, templateIds: string[]): Promise<boolean> {
    const project = projects.value.find(p => p.id === projectId)
    if (!project) return false

    const knownIds = new Set(project.phaseTemplates.map(template => template.id))
    if (templateIds.length !== project.phaseTemplates.length || templateIds.some(id => !knownIds.has(id))) {
      return false
    }

    try {
      const data = unwrapApiData<{ templates: ProjectPhaseTemplate[] }>(
        await projectApi.reorderPhaseTemplates(projectId, templateIds)
      )

      if (data?.templates) {
        upsertProject({ ...project, phaseTemplates: data.templates })
      } else {
        await init()
      }

      return true
    } catch (error) {
      console.error('Failed to reorder phase templates:', error)
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

    const temp = templates[index]
    templates[index] = templates[targetIndex]
    templates[targetIndex] = temp

    const templateIds = templates.map(t => t.id)

    try {
      await projectApi.reorderPhaseTemplates(projectId, templateIds)
      await init()
      return true
    } catch (error) {
      console.error('Failed to move phase template:', error)
      return false
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    try {
      await projectApi.delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProjectId.value === id) currentProjectId.value = null
      return true
    } catch (error) {
      console.error('Failed to delete project:', error)
      return false
    }
  }

  wsService.on(WSMessageType.ProjectCreate, (project: Project) => {
    upsertProject(project)
  })

  wsService.on(WSMessageType.ProjectUpdate, (project: Project) => {
    upsertProject(project)
  })

  wsService.on(WSMessageType.ProjectDelete, ({ id }: { id: string }) => {
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
    getProjectMemberUsers,
    isProjectMember,
    canOperateProject,
    canManageProject,
    fetchProjectMembers,
    updateProjectMembers,
    fetchReviewerCandidates,
    createProject,
    updateProject,
    deleteProject,
    getEnabledPhaseTemplates,
    addPhaseTemplate,
    updatePhaseTemplate,
    reorderPhaseTemplates,
    movePhaseTemplate
  }
})