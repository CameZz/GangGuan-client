<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore, storesManager } from '@/stores'
import ProjectModal from '@/components/project/ProjectModal.vue'
import type { Project } from '@/types'
import { createDefaultPhaseTemplates } from '@/utils/taskPhases'

const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()

const currentUser = computed(() => userStore.currentUser)
const projects = computed(() => projectStore.projects)
const canCreateProject = computed(() => userStore.isProjectManager)
const isProjectModalOpen = ref(false)
const isCreatingProject = ref(false)
const createProjectError = ref('')

function selectProject(projectId: string) {
  projectStore.setCurrentProject(projectId)
  router.push(`/kanban/${projectId}`)
}

async function handleLogout() {
  await storesManager.logout()
  router.push('/login')
}

function openProjectModal() {
  createProjectError.value = ''
  isProjectModalOpen.value = true
}

function closeProjectModal() {
  if (isCreatingProject.value) return
  isProjectModalOpen.value = false
  createProjectError.value = ''
}

async function handleProjectCreate(projectData: Partial<Project>) {
  if (isCreatingProject.value) return

  const name = projectData.name?.trim()
  if (!name) {
    createProjectError.value = '请输入项目名称'
    return
  }

  createProjectError.value = ''
  isCreatingProject.value = true

  const project = await projectStore.createProject({
    name,
    description: projectData.description?.trim() || '',
    phaseTemplates: createDefaultPhaseTemplates(),
    nonWorkdays: [],
    extraWorkdays: []
  })

  isCreatingProject.value = false

  if (!project) {
    createProjectError.value = '创建项目失败，请稍后重试'
    return
  }

  projectStore.setCurrentProject(project.id)
  closeProjectModal()
  router.push(`/kanban/${project.id}`)
}
</script>

<template>
  <div class="project-select-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="logo">钢 管 系 统</h1>
        <span class="user-greeting">{{ currentUser?.name }}，欢迎回来</span>
      </div>
      <button class="btn btn-ghost" @click="handleLogout">退出登录</button>
    </header>

    <main class="page-content">
      <div class="section-header">
        <h2 class="section-title">选择要操作的项目</h2>
        <button v-if="canCreateProject" class="btn btn-primary" @click="openProjectModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建项目
        </button>
      </div>
      <div class="projects-grid">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="selectProject(project.id)"
        >
          <div class="project-icon">{{ project.name.charAt(0).toUpperCase() }}</div>
          <div class="project-info">
            <h3 class="project-name">{{ project.name }}</h3>
            <p class="project-desc">{{ project.description }}</p>
          </div>
          <div class="project-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>
      <div v-if="projects.length === 0" class="empty-state">
        <p>暂无可用项目</p>
      </div>
    </main>

    <ProjectModal
      :is-open="isProjectModalOpen"
      :saving="isCreatingProject"
      :error="createProjectError"
      @close="closeProjectModal"
      @save="handleProjectCreate"
    />
  </div>
</template>

<style scoped>
.project-select-page {
  min-height: 100vh;
  background-color: var(--color-bg-secondary);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.user-greeting {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.page-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-header .btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.projects-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.project-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border-radius: var(--radius-lg);
  font-size: 24px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.project-info {
  flex: 1;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.project-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.project-arrow {
  color: var(--color-text-muted);
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-muted);
}
</style>
