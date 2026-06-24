// 通知 API

import api from './index'

export const notificationApi = {
  list: (params?: { unread?: boolean; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.unread) query.set('unread', 'true')
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return api.get(`/notifications${qs ? `?${qs}` : ''}`)
  },

  unreadCount: () =>
    api.get('/notifications/unread-count'),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/read-all')
}
