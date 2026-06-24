<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore, useProjectStore, useTaskStore } from '@/stores'
import type { Notification, NotificationType } from '@/types'

const router = useRouter()
const notificationStore = useNotificationStore()
const projectStore = useProjectStore()
const taskStore = useTaskStore()

const filter = ref<'all' | 'unread'>('all')
const isLoading = computed(() => notificationStore.isLoading)

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') {
    return notificationStore.unreadNotifications
  }
  return notificationStore.notifications
})

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  progress_update: '进度更新提醒',
  behind_progress: '进度落后提醒',
  comment: '评论通知',
  reference: '参考资源通知'
}

const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  progress_update: '📊',
  behind_progress: '⚠️',
  comment: '💬',
  reference: '📎'
}

function getTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] || type
}

function getTypeIcon(type: NotificationType): string {
  return NOTIFICATION_TYPE_ICONS[type] || '📌'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 消息类型 → 目标页面
const NOTIFICATION_ROUTE_MAP: Record<string, string> = {
  comment: 'kanban',
  reference: 'kanban',
  progress_update: 'member-schedule',
  behind_progress: 'member-schedule'
}

async function handleClickNotification(notification: Notification) {
  // Mark as read if unread
  if (!notification.readAt) {
    await notificationStore.markRead(notification.id)
  }

  // Navigate to related context
  if (notification.taskId) {
    const task = taskStore.findTaskById(notification.taskId) || await taskStore.fetchTaskById(notification.taskId, notification.projectId)
    const projectId = task?.projectId || notification.projectId

    if (projectId) {
      const routeName = NOTIFICATION_ROUTE_MAP[notification.type] || 'kanban'
      projectStore.setCurrentProject(projectId)
      router.push({
        path: `/${routeName}/${projectId}`,
        query: { taskId: notification.taskId }
      })
      return
    }
  }

  if (notification.projectId) {
    projectStore.setCurrentProject(notification.projectId)
    router.push(`/kanban/${notification.projectId}`)
    return
  }
}

async function handleMarkRead(notification: Notification) {
  await notificationStore.markRead(notification.id)
}

async function handleMarkAllRead() {
  await notificationStore.markAllRead()
}

onMounted(() => {
  notificationStore.fetchNotifications()
})
</script>

<template>
  <div class="message-center">
    <div class="message-center-header">
      <h1 class="page-title">消息中心</h1>
      <div class="header-actions">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'"
          >
            全部
          </button>
          <button
            class="filter-tab"
            :class="{ active: filter === 'unread' }"
            @click="filter = 'unread'"
          >
            未读
            <span v-if="notificationStore.unreadCount > 0" class="tab-badge">
              {{ notificationStore.unreadCount }}
            </span>
          </button>
        </div>
        <button
          v-if="notificationStore.unreadCount > 0"
          class="btn btn-ghost btn-sm"
          @click="handleMarkAllRead"
        >
          全部已读
        </button>
      </div>
    </div>

    <div class="message-list">
      <div v-if="isLoading" class="loading-state">
        <span class="loading-spinner"></span>
        加载中...
      </div>

      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon">🔔</div>
        <p class="empty-text">{{ filter === 'unread' ? '没有未读消息' : '暂无消息' }}</p>
      </div>

      <div
        v-for="notification in filteredNotifications"
        :key="notification.id"
        class="message-item"
        :class="{ unread: !notification.readAt }"
        @click="handleClickNotification(notification)"
      >
        <div class="message-icon">{{ getTypeIcon(notification.type) }}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-type">{{ getTypeLabel(notification.type) }}</span>
            <span class="message-time">{{ formatTime(notification.createdAt) }}</span>
          </div>
          <p class="message-title">{{ notification.title }}</p>
          <p class="message-body">{{ notification.body }}</p>
        </div>
        <div v-if="!notification.readAt" class="message-actions">
          <button
            class="mark-read-btn"
            title="标记已读"
            @click.stop="handleMarkRead(notification)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
        <div v-else class="read-indicator">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-center {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.message-center-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 4px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tab:hover {
  color: var(--color-text-primary);
}

.filter-tab.active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border-radius: 9px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.message-item:hover {
  background: var(--color-bg-secondary);
}

.message-item.unread {
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-bg-primary));
  border-left: 3px solid var(--color-primary);
}

.message-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.message-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.message-time {
  font-size: 12px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.message-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.message-body {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.mark-read-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mark-read-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-primary);
}

.read-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-top: 2px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

@media (max-width: 600px) {
  .message-center {
    padding: 16px;
  }

  .message-center-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .message-body {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
