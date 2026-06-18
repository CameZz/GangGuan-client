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
    api.patch(`/tasks/${taskId}/phases/${phaseId}/progress`, { progress })
}
