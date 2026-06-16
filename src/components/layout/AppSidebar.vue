<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore, usePlanningStore, useTaskStore } from '@/stores'
import type { Planning } from '@/types'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const planningStore = usePlanningStore()
const taskStore = useTaskStore()

const currentProject = computed(() => projectStore.currentProject)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)
const planningSyncedRouteNames = [
  'Dashboard',
  'ProjectDashboard',
  'Kanban',
  'ProjectKanban',
  'List',
  'ProjectList',
  'Timeline',
  'ProjectTimeline',
  'MemberSchedule',
  'ProjectMemberSchedule',
  'Members',
  'ProjectMembers'
]

// Collapse state
const incompleteExpanded = ref(true)
const completedExpanded = ref(true)

// New planning form state
const showNewPlanningForm = ref(false)
const newPlanningName = ref('')
const newPlanningDeadline = ref('')

// Sort by deadline helper
function sortByDeadline(plannings: Planning[], ascending: boolean = true): Planning[] {
  return [...plannings].sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    return ascending ? diff : -diff
  })
}

// Get plannings for current project only
const plannings = computed(() => {
  if (!currentProject.value) return []
  return planningStore.plannings.filter((p: Planning) => p.projectId === currentProject.value!.id)
})

// Check if a planning is completed (all tasks are done)
function isPlanningCompleted(planningId: string): boolean {
  const planningTasks = taskStore.tasks.filter((t: any) => t.planningId === planningId)
  if (planningTasks.length === 0) return false
  return planningTasks.every((t: any) => t.status === 'done')
}

// Completed plannings (deadline closest first - descending)
const completedPlannings = computed(() => {
  return sortByDeadline(plannings.value.filter((p: Planning) => isPlanningCompleted(p.id)), false)
})

// Incomplete plannings (deadline earliest first - ascending)
const incompletePlannings = computed(() => {
  return sortByDeadline(plannings.value.filter((p: Planning) => !isPlanningCompleted(p.id)), true)
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
    const routeName = String(route.name || '')
    if (!planningSyncedRouteNames.includes(routeName)) return

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

function selectIteration(planningId: string) {
  projectStore.setSelectedPlanning(planningId)
}

function toggleNewPlanningForm() {
  showNewPlanningForm.value = !showNewPlanningForm.value
  if (!showNewPlanningForm.value) {
    newPlanningName.value = ''
    newPlanningDeadline.value = ''
  }
}

function createPlanning() {
  if (!newPlanningName.value.trim() || !currentProject.value) return

  const planning = planningStore.createPlanning({
    name: newPlanningName.value.trim(),
    deadline: newPlanningDeadline.value ? new Date(newPlanningDeadline.value).toISOString() : null,
    projectId: currentProject.value.id,
  })

  // Reset form
  newPlanningName.value = ''
  newPlanningDeadline.value = ''
  showNewPlanningForm.value = false

  // Auto-select the new planning
  if (planning) {
    projectStore.setSelectedPlanning(planning.id)
  }
}
</script>

<template>
  <aside class="sidebar">
    <template v-if="currentProject">
      <div class="sidebar-section">
        <div class="section-header">
          <span class="section-title">迭代</span>
          <button class="btn-add" @click="toggleNewPlanningForm" :title="showNewPlanningForm ? '取消' : '新增迭代'">
            {{ showNewPlanningForm ? '✕' : '+' }}
          </button>
        </div>

        <!-- New Planning Form -->
        <div v-if="showNewPlanningForm" class="new-planning-form">
          <input
            v-model="newPlanningName"
            type="text"
            class="input"
            placeholder="迭代名称"
            @keyup.enter="createPlanning"
          />
          <input
            v-model="newPlanningDeadline"
            type="date"
            class="input"
            placeholder="截止日期"
          />
          <div class="form-actions">
            <button class="btn btn-primary btn-sm" @click="createPlanning" :disabled="!newPlanningName.trim()">
              创建
            </button>
            <button class="btn btn-secondary btn-sm" @click="toggleNewPlanningForm">
              取消
            </button>
          </div>
        </div>

        <div class="iteration-list">
          <template v-if="incompletePlannings.length > 0">
            <div class="iteration-group-title" @click="incompleteExpanded = !incompleteExpanded">
              <span class="expand-icon" :class="{ expanded: incompleteExpanded }">▶</span>
              未完成迭代 ({{ incompletePlannings.length }})
            </div>
            <template v-if="incompleteExpanded">
              <div
                v-for="planning in incompletePlannings"
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
            </template>
          </template>

          <template v-if="completedPlannings.length > 0">
            <div class="iteration-group-title" @click="completedExpanded = !completedExpanded">
              <span class="expand-icon" :class="{ expanded: completedExpanded }">▶</span>
              已完成迭代 ({{ completedPlannings.length }})
            </div>
            <template v-if="completedExpanded">
              <div
                v-for="planning in completedPlannings"
                :key="planning.id"
                class="iteration-item completed"
                :class="{ selected: selectedPlanningId === planning.id }"
                @click="selectIteration(planning.id)"
              >
                <span class="iteration-name">{{ planning.name }}</span>
                <span v-if="planning.deadline" class="iteration-deadline">
                  {{ new Date(planning.deadline).toLocaleDateString() }}
                </span>
              </div>
            </template>
          </template>

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

.btn-add {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 16px;
  transition: all var(--transition-fast);
}

.btn-add:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.new-planning-form {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}

.new-planning-form .input {
  width: 100%;
  padding: 6px 8px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.new-planning-form .input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.form-actions .btn {
  flex: 1;
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

.iteration-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 8px 12px 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.iteration-group-title:hover {
  color: var(--color-text-secondary);
}

.expand-icon {
  font-size: 8px;
  transition: transform var(--transition-fast);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.iteration-item.completed {
  opacity: 0.6;
}

.iteration-item.completed .iteration-name {
  text-decoration: line-through;
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
