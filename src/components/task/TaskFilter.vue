<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TaskStatus, TaskStage, TaskPriority } from '@/types'
import { TASK_STAGES } from '@/types'
import { useMemberStore } from '@/stores'

const props = withDefaults(defineProps<{
  showStatusFilter?: boolean
}>(), {
  showStatusFilter: true
})

const emit = defineEmits<{
  filter: [filters: TaskFilters]
}>()

interface TaskFilters {
  status?: TaskStatus
  stage?: TaskStage
  priority?: TaskPriority
  assigneeId?: string | null
  myParticipationOnly?: boolean
}

const memberStore = useMemberStore()
const members = computed(() => memberStore.members)

const selectedStatus = ref<TaskStatus | ''>('')
const selectedStage = ref<TaskStage | ''>('')
const selectedPriority = ref<TaskPriority | ''>('')
const selectedAssigneeId = ref<string | null>(null)
const myParticipationOnly = ref(false)

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

watch([selectedStatus, selectedStage, selectedPriority, selectedAssigneeId, myParticipationOnly], () => {
  emit('filter', {
    status: selectedStatus.value as TaskStatus || undefined,
    stage: selectedStage.value as TaskStage || undefined,
    priority: selectedPriority.value as TaskPriority || undefined,
    assigneeId: selectedAssigneeId.value,
    myParticipationOnly: myParticipationOnly.value
  })
}, { immediate: true })

function clearFilters() {
  selectedStatus.value = ''
  selectedStage.value = ''
  selectedPriority.value = ''
  selectedAssigneeId.value = null
  myParticipationOnly.value = false
}

const hasActiveFilters = computed(() => {
  return selectedStatus.value ||
    selectedStage.value ||
    selectedPriority.value ||
    selectedAssigneeId.value !== null ||
    myParticipationOnly.value
})
</script>

<template>
  <div class="task-filter">
    <div class="filter-row">
      <select v-if="showStatusFilter" v-model="selectedStatus" class="input select filter-select">
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

      <label class="filter-toggle">
        <input type="checkbox" v-model="myParticipationOnly" />
        <span>我的任务</span>
      </label>

      <button class="btn btn-ghost" :disabled="!hasActiveFilters" @click="clearFilters">
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

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: var(--color-text-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.filter-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
</style>
