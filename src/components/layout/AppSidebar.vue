<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore, usePlanningStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const planningStore = usePlanningStore()

const currentProject = computed(() => projectStore.currentProject)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)

// Get plannings for current project only
const plannings = computed(() => {
  if (!currentProject.value) return []
  return planningStore.plannings.filter(p => p.projectId === currentProject.value!.id)
})

// Auto-select first planning when project changes and no planning is selected
watch(currentProject, (newProject, oldProject) => {
  // Only auto-select if project actually changed
  if (newProject && oldProject?.id !== newProject.id && plannings.value.length > 0 && !selectedPlanningId.value) {
    const firstPlanning = plannings.value[0]
    projectStore.setSelectedPlanning(firstPlanning.id)
  }
}, { immediate: true })

// Sync planning from URL when route changes
watch(() => route.query.planning, (newPlanning) => {
  if (newPlanning && newPlanning !== selectedPlanningId.value) {
    projectStore.setSelectedPlanning(newPlanning as string)
  }
}, { immediate: true })

// Update route when selectedPlanningId changes from store
watch(selectedPlanningId, (newId) => {
  if (newId && currentProject.value) {
    let currentPath = route.path.split('/')[1]
    // If on projects page or root, default to kanban
    if (currentPath === 'projects' || currentPath === '') {
      currentPath = 'kanban'
    }
    const expectedPath = `/${currentPath}/${currentProject.value.id}?planning=${newId}`
    // Only update route if it's different from current
    if (route.fullPath !== expectedPath) {
      router.replace(expectedPath)
    }
  }
})

function exitProject() {
  projectStore.setCurrentProject(null)
  router.push('/projects')
}

function selectIteration(planningId: string) {
  projectStore.setSelectedPlanning(planningId)
}
</script>

<template>
  <aside class="sidebar">
    <template v-if="currentProject">
      <div class="sidebar-header">
        <div class="project-info">
          <div class="project-icon">{{ currentProject.name.charAt(0).toUpperCase() }}</div>
          <div class="project-details">
            <h2 class="project-name">{{ currentProject.name }}</h2>
            <button class="btn-exit" @click="exitProject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
              </svg>
              切换项目
            </button>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="section-header">
          <span class="section-title">迭代</span>
        </div>
        <div class="iteration-list">
          <div
            v-for="planning in plannings"
            :key="planning.id"
            class="iteration-item"
            :class="{ selected: selectedPlanningId === planning.id }"
            @click="selectIteration(planning.id)"
          >
            <span class="iteration-name">{{ planning.name }}</span>
            <span v-if="planning.deadline" class="iteration-deadline">
              {{ new Date(planning.deadline).toLocaleDateString() }}
            </span>
          </div>
          <div v-if="plannings.length === 0" class="empty-iterations">
            暂无迭代
          </div>
        </div>
      </div>
    </template>

    <div v-else class="sidebar-empty">
      <p>请先选择项目</p>
      <button class="btn btn-primary btn-sm" @click="router.push('/projects')">
        选择项目
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: calc(100vh - 64px);
  background-color: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.project-info {
  display: flex;
  gap: 12px;
}

.project-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border-radius: var(--radius-md);
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.project-details {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-exit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-exit:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-section {
  padding: 12px 8px;
  flex: 1;
  overflow-y: auto;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.iteration-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.iteration-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.iteration-item:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.iteration-item.selected {
  background-color: var(--color-primary);
  color: white;
}

.iteration-item.selected .iteration-deadline {
  color: rgba(255, 255, 255, 0.7);
}

.btn-clear {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.btn-clear:hover {
  color: var(--color-text-primary);
}

.iteration-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.iteration-deadline {
  font-size: 11px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-left: 8px;
}

.empty-iterations {
  padding: 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--color-text-muted);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
