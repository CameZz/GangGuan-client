// Pinia store configuration

import { createPinia } from 'pinia'
import { useProjectStore } from './project'
import { useMemberStore } from './member'
import { useTaskStore } from './task'
import { usePlanningStore } from './planning'
import { useUserStore } from './user'

export const pinia = createPinia()

// Export stores
export { useProjectStore, useMemberStore, useTaskStore, usePlanningStore, useUserStore }

// Initialize all stores with mock data
export function initStores() {
  const projectStore = useProjectStore()
  const memberStore = useMemberStore()
  const taskStore = useTaskStore()
  const planningStore = usePlanningStore()
  const userStore = useUserStore()

  projectStore.init()
  memberStore.init()
  taskStore.init()
  planningStore.init()
  userStore.init()
}