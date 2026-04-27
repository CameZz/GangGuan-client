<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TaskStatus, TaskPriority } from '@/types'
import { useProjectStore, useMemberStore } from '@/stores'

const props = defineProps<{
  projectId?: string
}>()

const emit = defineEmits<{
  filter: [filters: TaskFilters]
}>()

interface TaskFilters {
  projectId?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
}

const projectStore = useProjectStore()
const memberStore = useMemberStore()

const projects = computed(() => projectStore.projects)
const members = computed(() => memberStore.members)

const selectedProjectId = ref(props.projectId || '')
const selectedStatus = ref<TaskStatus | ''>('')
const selectedPriority = ref<TaskPriority | ''>('')
const selectedAssigneeId = ref<string | null>(null)

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'done', label: '已完成' }
]

const priorityOptions = [
  { value: '', label: '全部优先级' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
]

watch([selectedProjectId, selectedStatus, selectedPriority, selectedAssigneeId], () => {
  emit('filter', {
    projectId: selectedProjectId.value || undefined,
    status: selectedStatus.value as TaskStatus || undefined,
    priority: selectedPriority.value as TaskPriority || undefined,
    assigneeId: selectedAssigneeId.value
  })
}, { immediate: true })

watch(() => props.projectId, (newId) => {
  selectedProjectId.value = newId || ''
})

function clearFilters() {
  selectedProjectId.value = ''
  selectedStatus.value = ''
  selectedPriority.value = ''
  selectedAssigneeId.value = null
}

const hasActiveFilters = computed(() => {
  return selectedProjectId.value || selectedStatus.value || selectedPriority.value || selectedAssigneeId.value !== null
})
</script>

<template>
  <div class="task-filter">
    <div class="filter-row">
      <select v-model="selectedProjectId" class="input select filter-select">
        <option value="">全部项目</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">
          {{ project.name }}
        </option>
      </select>

      <select v-model="selectedStatus" class="input select filter-select">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select v-model="selectedPriority" class="input select filter-select">
        <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select v-model="selectedAssigneeId" class="input select filter-select">
        <option :value="null">全部成员</option>
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.name }}
        </option>
      </select>

      <button v-if="hasActiveFilters" class="btn btn-ghost" @click="clearFilters">
        清除筛选
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-filter {
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  flex: 1;
  min-width: 150px;
}
</style>
