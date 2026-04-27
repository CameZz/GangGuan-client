<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '@/types'
import { useTaskStore } from '@/stores'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  click: []
}>()

const taskStore = useTaskStore()

const projectTasks = computed(() => {
  return taskStore.tasks.filter(t => t.projectId === props.project.id)
})

const taskStats = computed(() => {
  const tasks = projectTasks.value
  return {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length
  }
})

const completionPercentage = computed(() => {
  if (taskStats.value.total === 0) return 0
  return Math.round((taskStats.value.done / taskStats.value.total) * 100)
})
</script>

<template>
  <div class="project-card" @click="emit('click')">
    <div class="project-header">
      <div class="project-icon">{{ project.name.charAt(0).toUpperCase() }}</div>
      <div class="project-info">
        <h3 class="project-name">{{ project.name }}</h3>
        <p class="project-description">{{ project.description }}</p>
      </div>
    </div>

    <div class="project-stats">
      <div class="stat">
        <span class="stat-value">{{ taskStats.total }}</span>
        <span class="stat-label">总计</span>
      </div>
      <div class="stat">
        <span class="stat-value todo">{{ taskStats.todo }}</span>
        <span class="stat-label">待办</span>
      </div>
      <div class="stat">
        <span class="stat-value progress">{{ taskStats.inProgress }}</span>
        <span class="stat-label">进行中</span>
      </div>
      <div class="stat">
        <span class="stat-value done">{{ taskStats.done }}</span>
        <span class="stat-label">已完成</span>
      </div>
    </div>

    <div class="project-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${completionPercentage}%` }"></div>
      </div>
      <span class="progress-text">{{ completionPercentage }}% 完成</span>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.project-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.project-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  font-size: 20px;
  font-weight: 700;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.project-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stat {
  text-align: center;
  padding: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value.todo {
  color: #d97706;
}

.stat-value.progress {
  color: #2563eb;
}

.stat-value.done {
  color: #16a34a;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.project-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-success);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>
