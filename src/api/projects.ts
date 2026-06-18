// 项目 API

import api from './index'

export const projectApi = {
  getAll: () =>
    api.get('/projects'),

  getById: (id: string) =>
    api.get(`/projects/${id}`),

  create: (data: any) =>
    api.post('/projects', data),

  update: (id: string, data: any) =>
    api.put(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  addPhaseTemplate: (projectId: string, data: { name: string }) =>
    api.post(`/projects/${projectId}/phase-templates`, data),

  updatePhaseTemplate: (projectId: string, templateId: string, data: any) =>
    api.put(`/projects/${projectId}/phase-templates/${templateId}`, data),

  reorderPhaseTemplates: (projectId: string, templateIds: string[]) =>
    api.put(`/projects/${projectId}/phase-templates/reorder`, { templateIds })
}
