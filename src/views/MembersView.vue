<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore, useTaskStore } from '@/stores'
import { ROLES } from '@/types'

const userStore = useUserStore()
const taskStore = useTaskStore()

const users = computed(() => userStore.getAllUsers())
const selectedRole = ref<string>('')

const filteredUsers = computed(() => {
  if (!selectedRole.value) return users.value
  return users.value.filter(u => u.role === selectedRole.value)
})

function getMemberTaskCount(userId: string): number {
  return taskStore.tasks.filter(t => t.assigneeId === userId).length
}

function getMemberDoneCount(userId: string): number {
  return taskStore.tasks.filter(t => t.assigneeId === userId && t.status === 'done').length
}

function getRoleName(roleType: string): string {
  const role = ROLES.find(r => r.type === roleType)
  return role?.name || roleType
}
</script>

<template>
  <div class="page members-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">团队成员</h1>
        <p class="page-subtitle">查看团队成员和工作量</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedRole" class="input select role-filter">
          <option value="">全部角色</option>
          <option v-for="role in ROLES" :key="role.type" :value="role.type">
            {{ role.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="filteredUsers.length > 0" class="members-grid">
      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="member-card"
      >
        <div class="member-header">
          <img :src="user.avatar" :alt="user.name" class="member-avatar" />
          <div class="member-info">
            <h3 class="member-name">{{ user.name }}</h3>
            <p class="member-email">{{ user.email }}</p>
            <div class="member-tags">
              <span class="role-badge">{{ getRoleName(user.role) }}</span>
              <span v-if="user.isAdmin" class="admin-badge">管理员</span>
            </div>
          </div>
        </div>
        <div class="member-stats">
          <div class="stat">
            <span class="stat-value">{{ getMemberTaskCount(user.id) }}</span>
            <span class="stat-label">已分配</span>
          </div>
          <div class="stat">
            <span class="stat-value done">{{ getMemberDoneCount(user.id) }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat">
            <span class="stat-value pending">{{ getMemberTaskCount(user.id) - getMemberDoneCount(user.id) }}</span>
            <span class="stat-label">待处理</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>暂无成员</p>
    </div>
  </div>
</template>

<style scoped>
.members-page {
  max-width: 100%;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.role-filter {
  min-width: 120px;
  height: 38px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 8px;
}

@media (min-width: 1600px) {
  .members-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 2000px) {
  .members-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.members-grid::-webkit-scrollbar {
  width: 6px;
}

.members-grid::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
}

.members-grid::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.member-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all var(--transition-fast);
}

.member-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.member-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.member-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.member-email {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.member-tags {
  display: flex;
  gap: 6px;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  border-radius: var(--radius-sm);
}

.admin-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #d97706;
  background-color: #fef3c7;
  border-radius: var(--radius-sm);
}

.member-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value.done {
  color: var(--color-success);
}

.stat-value.pending {
  color: var(--color-warning);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-muted);
}
</style>