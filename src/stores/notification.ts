// Notification store - manages notification state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification } from '@/types'
import { notificationApi } from '@/api/notifications'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)

  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.readAt)
  )

  const readNotifications = computed(() =>
    notifications.value.filter(n => n.readAt)
  )

  async function fetchNotifications(options?: { unread?: boolean }): Promise<void> {
    isLoading.value = true
    try {
      const data = unwrapApiData<{ notifications: Notification[] }>(
        await notificationApi.list({ unread: options?.unread }) 
      )
      if (data?.notifications) {
        notifications.value = data.notifications
      }
    } catch (error) {
      console.error('获取通知列表失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchUnreadCount(): Promise<void> {
    try {
      const data = unwrapApiData<{ count: number }>(
        await notificationApi.unreadCount() 
      )
      if (data?.count !== undefined) {
        unreadCount.value = data.count
      }
    } catch (error) {
      console.error('获取未读数失败:', error)
    }
  }

  async function markRead(id: string): Promise<void> {
    try {
      const data = unwrapApiData<{ notification: Notification }>(
        await notificationApi.markRead(id) 
      )
      if (data?.notification) {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index !== -1) {
          notifications.value[index] = data.notification
        }
        if (unreadCount.value > 0) {
          unreadCount.value--
        }
      }
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  async function markAllRead(): Promise<void> {
    try {
      await notificationApi.markAllRead()
      const now = new Date().toISOString()
      notifications.value = notifications.value.map(n =>
        n.readAt ? n : { ...n, readAt: now }
      )
      unreadCount.value = 0
    } catch (error) {
      console.error('全部标记已读失败:', error)
    }
  }

  function clearData(): void {
    notifications.value = []
    unreadCount.value = 0
  }

  // WebSocket handlers
  wsService.on('notification:create', (notification: Notification) => {
    console.log('[WS] notification:create received', notification?.id)
    // Prepend to list if loaded
    if (notifications.value.length > 0) {
      const exists = notifications.value.some(n => n.id === notification.id)
      if (!exists) {
        notifications.value.unshift(notification)
      }
    }
    // Always increment unread count
    unreadCount.value++
  })

  wsService.on('notification:update', (notification: Notification) => {
    console.log('[WS] notification:update received', notification?.id)
    const index = notifications.value.findIndex(n => n.id === notification.id)
    if (index !== -1) {
      const wasUnread = !notifications.value[index].readAt
      notifications.value[index] = notification
      if (wasUnread && notification.readAt && unreadCount.value > 0) {
        unreadCount.value--
      }
    }
  })

  wsService.on('notification:read-all', (data: { readAt: string; count: number }) => {
    console.log('[WS] notification:read-all received', data)
    const now = data.readAt
    notifications.value = notifications.value.map(n =>
      n.readAt ? n : { ...n, readAt: now }
    )
    unreadCount.value = 0
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    unreadNotifications,
    readNotifications,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    clearData
  }
})
