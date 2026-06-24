// 每日备注 API

import api from './index'

export const dailyNoteApi = {
  getByDateRange: (projectId: string, startDate: string, endDate: string) =>
    api.get(`/projects/${projectId}/daily-notes`, { params: { startDate, endDate } }),

  upsert: (projectId: string, dateKey: string, content: string) =>
    api.put(`/projects/${projectId}/daily-notes/${dateKey}`, { content }),

  remove: (projectId: string, dateKey: string) =>
    api.delete(`/projects/${projectId}/daily-notes/${dateKey}`)
}
