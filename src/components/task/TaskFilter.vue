<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TaskStatus, TaskStage, TaskPriority } from '@/types'
import { TASK_STAGES } from '@/types'
import { useMemberStore } from '@/stores'

const emit = defineEmits<{
  filter: [filters: TaskFilters]
}>()

interface TaskFilters {
  status?: TaskStatus
  stage?: TaskStage
  priority?: TaskPriority
  assigneeId?: string | null
}

const memberStore = useMemberStore()
const members = computed(() => memberStore.members)

const selectedStatus = ref<TaskStatus | ''>('')
const selectedStage = ref<TaskStage | ''>('')
const selectedPriority = ref<TaskPriority | ''>('')
const selectedAssigneeId = ref<string | null>(null)

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'abandoned', label: '已废弃' }
]

const stageOptions = [
  { value: '', label: '全部阶段' },
  ...TASK_STAGES.map(s => ({ value: s.value, label: s.label }))
]

const priorityOptions = [
  { value: '', label: '全部优先级' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
]

watch([selectedStatus, selectedStage, selectedPriority, selectedAssigneeId], () => {
  emit('filter', {
    status: selectedStatus.value as TaskStatus || undefined,
    stage: selectedStage.value as TaskStage || undefined,
    priority: selectedPriority.value as TaskPriority || undefined,
    assigneeId: selectedAssigneeId.value
  })
}, { immediate: true })

function clearFilters() {
  selectedStatus.value = ''
  selectedStage.value = ''
  selectedPriority.value = ''
  selectedAssigneeId.value = null
}

const hasActiveFilters = computed(() => {
  return selectedStatus.value || selectedStage.value || selectedPriority.value || selectedAssigneeId.value !== null
})
</script>

<template>
  <div class="task-filter">
    <div class="filter-row">
      <select v-model="selectedStatus" class="input select filter-select">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select v-model="selectedStage" class="input select filter-select">
        <option v-for="opt in stageOptions" :key="opt.value" :value="opt.value">
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
