// 规划 API

import api from './index'

export const planningApi = {
  getByProject: (projectId: string) =>
    api.get(`/projects/${projectId}/plannings`),

  getById: (id: string) =>
    api.get(`/plannings/${id}`),

  create: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/plannings`, data),

  update: (id: string, data: any) =>
    api.put(`/projects/${data.projectId}/plannings/${id}`, data),

  delete: (id: string) =>
    api.delete(`/plannings/${id}`)
}
