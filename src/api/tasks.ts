// 任务 API

import api from './index'

export const taskApi = {
  getByProject: (projectId: string) =>
    api.get(`/tasks/project/${projectId}`),

  getByPlanning: (planningId: string) =>
    api.get(`/tasks/planning/${planningId}`),

  getById: (id: string) =>
    api.get(`/tasks/${id}`),

  create: (data: any) =>
    api.post('/tasks', data),

  update: (id: string, data: any) =>
    api.put(`/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`),

  move: (id: string, status: string) =>
    api.patch(`/tasks/${id}/move`, { status }),

  updatePhaseProgress: (taskId: string, phaseId: string, progress: number) =>
    api.patch(`/tasks/${taskId}/phases/${phaseId}/progress`, { progress }),

  // 评论
  addComment: (taskId: string, data: { content: string }) =>
    api.post(`/tasks/${taskId}/comments`, data),

  updateComment: (taskId: string, commentId: string, data: { content: string }) =>
    api.put(`/tasks/${taskId}/comments/${commentId}`, data),

  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),

  // 参考资料
  addReference: (taskId: string, data: { type: string; url: string; title: string }) =>
    api.post(`/tasks/${taskId}/references`, data),

  updateReference: (taskId: string, referenceId: string, data: { type: string; url: string; title: string }) =>
    api.put(`/tasks/${taskId}/references/${referenceId}`, data),

  deleteReference: (taskId: string, referenceId: string) =>
    api.delete(`/tasks/${taskId}/references/${referenceId}`)
}
