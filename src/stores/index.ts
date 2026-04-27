// Pinia store configuration

import { createPinia } from 'pinia'
import { useProjectStore } from './project'
import { useMemberStore } from './member'
import { useTaskStore } from './task'

export const pinia = createPinia()

// Export stores
export { useProjectStore, useMemberStore, useTaskStore }

// Initialize all stores with mock data
export function initStores() {
  const projectStore = useProjectStore()
  const memberStore = useMemberStore()
  const taskStore = useTaskStore()

  projectStore.init()
  memberStore.init()
  taskStore.init()
}
