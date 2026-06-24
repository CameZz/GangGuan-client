// Planning store - manages task planning (task sets)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Planning } from '@/types'
import { planningApi } from '@/api/plannings'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'

export const usePlanningStore = defineStore('planning', () => {
  const plannings = ref<Planning[]>([])
  const isLoading = ref(false)

  const planningCount = computed(() => plannings.value.length)

  const getPlanningById = (id: string): Planning | undefined => {
    return plannings.value.find(p => p.id === id)
  }

  const getPlanningsByProject = (projectId: string) => {
    return plannings.value.filter(p => p.projectId === projectId)
  }

  async function init() {
    // plannings 会在 sync:init 时通过 WebSocket 获取
    // 这里留空，等待 WebSocket 同步
  }

  async function fetchPlannings(projectId: string): Promise<void> {
    try {
      const result = unwrapApiData<{ plannings: Planning[] }>(
        await planningApi.getByProject(projectId) as any
      )
      if (result?.plannings) {
        // 合并到现有数据，避免覆盖其他项目的 plannings
        const existingIds = new Set(plannings.value.map(p => p.id))
        const newPlannings = result.plannings.filter(p => !existingIds.has(p.id))
        plannings.value = [...plannings.value, ...newPlannings]
      }
    } catch (error) {
      console.error('获取迭代列表失败:', error)
    }
  }

  // 从 WebSocket sync:init 设置数据
  function setPlannings(data: Planning[]) {
    plannings.value = data
  }

  function clearData() {
    plannings.value = []
  }

  async function createPlanning(projectId: string, data: Omit<Planning, 'id' | 'createdAt'>): Promise<Planning | null> {
    try {
      const result = unwrapApiData<{ planning: Planning }>(await planningApi.create(projectId, data) as any)
      if (result?.planning) {
        const planning = result.planning
        if (!plannings.value.find(p => p.id === planning.id)) {
          plannings.value.push(planning)
        }
        return planning
      }
      return null
    } catch (error) {
      console.error('创建规划失败:', error)
      return null
    }
  }

  async function updatePlanning(id: string, data: Partial<Planning>): Promise<Planning | null> {
    try {
      const existing = plannings.value.find(p => p.id === id)
      const projectId = data.projectId || existing?.projectId
      if (!projectId) return null
      const result = unwrapApiData<{ planning: Planning }>(await planningApi.update(id, {
        ...data,
        projectId
      }) as any)
      if (result?.planning) {
        const planning = result.planning
        const index = plannings.value.findIndex(p => p.id === id)
        if (index !== -1) {
          plannings.value[index] = planning
        }
        return planning
      }
      return null
    } catch (error) {
      console.error('更新规划失败:', error)
      return null
    }
  }

  async function deletePlanning(id: string): Promise<boolean> {
    try {
      const existing = plannings.value.find(p => p.id === id)
      if (!existing?.projectId) return false
      await planningApi.delete(existing.projectId, id)
      plannings.value = plannings.value.filter(p => p.id !== id)
      return true
    } catch (error) {
      console.error('删除规划失败:', error)
      return false
    }
  }

  // 监听 WebSocket 事件
  wsService.on('planning:create', (planning: Planning) => {
    if (!plannings.value.find(p => p.id === planning.id)) {
      plannings.value.push(planning)
    }
  })

  wsService.on('planning:update', (planning: Planning) => {
    const index = plannings.value.findIndex(p => p.id === planning.id)
    if (index !== -1) {
      plannings.value[index] = planning
    }
  })

  wsService.on('planning:delete', ({ id }: { id: string }) => {
    plannings.value = plannings.value.filter(p => p.id !== id)
  })

  return {
    plannings,
    planningCount,
    isLoading,
    getPlanningById,
    getPlanningsByProject,
    init,
    fetchPlannings,
    setPlannings,
    clearData,
    createPlanning,
    updatePlanning,
    deletePlanning
  }
})
