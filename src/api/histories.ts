// 历史记录 API

import api from './index'

export const historyApi = {
  getTaskHistories: (taskId: string) =>
    api.get(`/tasks/${taskId}/histories`),

  getTaskProgressHistories: (taskId: string) =>
    api.get(`/tasks/${taskId}/progress-histories`),

  getProjectProgressHistories: (projectId: string) =>
    api.get(`/projects/${projectId}/progress-histories`)
}
