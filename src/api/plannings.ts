// 规划 API

import api from './index'

export const planningApi = {
  getByProject: (projectId: string) =>
    api.get(`/projects/${projectId}/plannings`),

  getById: (projectId: string, id: string) =>
    api.get(`/projects/${projectId}/plannings/${id}`),

  create: (projectId: string, data: any) =>
    api.post(`/projects/${projectId}/plannings`, data),

  update: (id: string, data: any) =>
    api.put(`/projects/${data.projectId}/plannings/${id}`, data),

  delete: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/plannings/${id}`)
}
