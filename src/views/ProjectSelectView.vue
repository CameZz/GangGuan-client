<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore, storesManager } from '@/stores'

const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()

const currentUser = computed(() => userStore.currentUser)
const projects = computed(() => projectStore.projects)
const isAdmin = computed(() => userStore.isAdmin)

function selectProject(projectId: string) {
  projectStore.setCurrentProject(projectId)
  router.push(`/kanban/${projectId}`)
}

async function handleLogout() {
  await storesManager.logout()
  router.push('/login')
}

function goToAdmin() {
  router.push('/admin')
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
        <button v-if="isAdmin" class="btn btn-secondary" @click="goToAdmin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          项目管理
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
  </div>
</template>

<style scoped>
.project-select-page {
  max-width: 100%;
  width: 100%;
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
