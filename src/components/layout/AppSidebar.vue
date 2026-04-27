<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()

const projects = computed(() => projectStore.projects)

const currentProjectId = computed(() => route.params.projectId as string | undefined)

function selectProject(projectId: string) {
  projectStore.setCurrentProject(projectId)
  router.push(`/kanban/${projectId}`)
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">项目</h2>
      <router-link to="/kanban" class="btn btn-ghost btn-sm">所有任务</router-link>
    </div>
    <div class="project-list">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-item"
        :class="{ active: currentProjectId === project.id }"
        @click="selectProject(project.id)"
      >
        <div class="project-icon">{{ project.name.charAt(0).toUpperCase() }}</div>
        <div class="project-info">
          <div class="project-name">{{ project.name }}</div>
          <div class="project-desc">{{ project.description }}</div>
        </div>
      </div>
      <div v-if="projects.length === 0" class="empty-state">
        暂无项目
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: calc(100vh - 64px);
  background-color: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.project-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.project-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.project-item:hover {
  background-color: var(--color-bg-tertiary);
}

.project-item.active {
  background-color: var(--color-primary);
}

.project-item.active .project-name,
.project-item.active .project-desc {
  color: white;
}

.project-item.active .project-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.project-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  font-weight: 600;
  color: var(--color-primary);
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>
