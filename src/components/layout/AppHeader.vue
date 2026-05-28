<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore } from '@/stores'

const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const currentUser = computed(() => userStore.currentUser)
const currentProject = computed(() => projectStore.currentProject)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)

function handleLogout() {
  userStore.logout()
  projectStore.setCurrentProject(null)
  router.push('/login')
}

function getNavLink(path: string): string {
  if (!currentProject.value) return path
  const base = `${path}/${currentProject.value.id}`
  if (selectedPlanningId.value) {
    return `${base}?planning=${selectedPlanningId.value}`
  }
  return base
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <h1 class="logo" @click="router.push(currentProject ? '/projects' : '/login')">钢 管 系 统</h1>
      <div v-if="currentProject" class="project-info">
        <div class="project-icon">{{ currentProject.name.charAt(0).toUpperCase() }}</div>
        <div class="project-details">
          <span class="project-name">{{ currentProject.name }}</span>
          <button class="btn-switch" @click="router.push('/projects')">
            <svg width="14" height="14" viewBox="0 -5 24 25" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
            </svg>
            切换项目
        </button>
        </div>
      </div>
      <nav v-if="isLoggedIn && currentProject" class="nav">
        <router-link :to="getNavLink('/kanban')" class="nav-link">看板</router-link>
        <router-link :to="getNavLink('/list')" class="nav-link">列表</router-link>
        <router-link :to="getNavLink('/timeline')" class="nav-link">时间轴</router-link>
        <router-link :to="getNavLink('/member-schedule')" class="nav-link">成员排期</router-link>
        <router-link :to="getNavLink('/members')" class="nav-link">成员</router-link>
        <router-link v-if="isAdmin" to="/admin" class="nav-link">管理</router-link>
      </nav>
    </div>
    <div class="header-right">
      <template v-if="isLoggedIn">
        <router-link to="/profile" class="user-info">
          <img :src="currentUser?.avatar" :alt="currentUser?.name" class="user-avatar" />
          <span class="user-name">{{ currentUser?.name }}</span>
        </router-link>
        <button class="btn btn-ghost btn-sm" @click="handleLogout">
          退出
        </button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn btn-primary btn-sm">
          登录
        </router-link>
      </template>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
}

.project-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 14px;
  color: white;
  flex-shrink: 0;
}

.project-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.btn-switch {
  padding: 0;
  font-size: 11px;
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1.2;
}

.btn-switch:hover {
  color: var(--color-primary);
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.nav-link.router-link-active {
  background-color: var(--color-primary);
  color: white;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.user-info:hover {
  background-color: var(--color-bg-tertiary);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>