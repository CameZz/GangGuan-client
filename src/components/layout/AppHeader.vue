<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProjectStore, useNotificationStore, storesManager } from '@/stores'

const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()
const notificationStore = useNotificationStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentUser = computed(() => userStore.currentUser)
const isAdmin = computed(() => currentUser.value?.isAdmin === true)
const isProjectManager = computed(() => userStore.isProjectManager)
const currentProject = computed(() => projectStore.currentProject)
const selectedPlanningId = computed(() => projectStore.selectedPlanningId)
const unreadCount = computed(() => notificationStore.unreadCount)

async function handleLogout() {
  await storesManager.logout()
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

function getProjectDetailLink(): string {
  return currentProject.value ? `/project/${currentProject.value.id}` : '/projects'
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
        <router-link :to="getNavLink('/members')" class="nav-link">成员</router-link>
        <router-link :to="getNavLink('/member-schedule')" class="nav-link">成员排期</router-link>
        <router-link v-if="isProjectManager" :to="getProjectDetailLink()" class="nav-link">项目详情</router-link>
        <router-link v-if="isAdmin" to="/admin" class="nav-link">管理</router-link>
      </nav>
    </div>
    <div class="header-right">
      <template v-if="isLoggedIn">
        <router-link to="/messages" class="message-center-btn" title="消息中心">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </router-link>
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
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  max-width: 100vw;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  min-width: 0;
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
  min-width: 0;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-shrink: 0;
}

.nav {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  flex: 0 0 auto;
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
  flex-shrink: 0;
}

.message-center-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.message-center-btn:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.message-center-btn.router-link-active {
  color: var(--color-primary);
}

.unread-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: white;
  background-color: #ef4444;
  border-radius: 8px;
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

@media (max-width: 820px) {
  .header {
    height: auto;
    min-height: 64px;
    padding: 8px 16px;
    flex-wrap: wrap;
  }

  .header-left {
    flex: 1 1 100%;
    gap: 12px;
    flex-wrap: wrap;
  }

  .project-info {
    flex: 1 1 180px;
  }

  .nav {
    flex: 1 1 100%;
    order: 3;
    padding-bottom: 2px;
  }

  .header-right {
    margin-left: auto;
  }
}

@media (max-width: 520px) {
  .user-name,
  .btn-switch svg {
    display: none;
  }

  .nav-link {
    padding: 8px 12px;
  }
}
</style>
