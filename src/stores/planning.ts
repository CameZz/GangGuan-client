// Planning store - manages task planning (task sets)

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Planning } from '@/types'
import mockApi from '@/utils/mock'

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

  function init() {
    isLoading.value = true
    plannings.value = mockApi.getPlannings()
    isLoading.value = false
  }

  function createPlanning(data: Omit<Planning, 'id' | 'createdAt'>) {
    const planning = mockApi.createPlanning(data)
    plannings.value.push(planning)
    return planning
  }

  function updatePlanning(id: string, data: Partial<Planning>) {
    const updated = mockApi.updatePlanning(id, data)
    if (updated) {
      const index = plannings.value.findIndex(p => p.id === id)
      if (index !== -1) {
        plannings.value[index] = updated
      }
    }
    return updated
  }

  function deletePlanning(id: string) {
    const success = mockApi.deletePlanning(id)
    if (success) {
      plannings.value = plannings.value.filter(p => p.id !== id)
    }
    return success
  }

  // Listen for mock events
  mockApi.on('planning:create', (planning: Planning) => {
    if (!plannings.value.find(p => p.id === planning.id)) {
      plannings.value.push(planning)
    }
  })

  mockApi.on('planning:update', (planning: Planning) => {
    const index = plannings.value.findIndex(p => p.id === planning.id)
    if (index !== -1) {
      plannings.value[index] = planning
    }
  })

  mockApi.on('planning:delete', ({ id }: { id: string }) => {
    plannings.value = plannings.value.filter(p => p.id !== id)
  })

  return {
    plannings,
    planningCount,
    isLoading,
    getPlanningById,
    getPlanningsByProject,
    init,
    createPlanning,
    updatePlanning,
    deletePlanning
  }
})