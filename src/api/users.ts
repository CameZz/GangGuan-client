// 用户 API

import api from './index'

export const userApi = {
  getAll: () =>
    api.get('/users'),

  getById: (id: string) =>
    api.get(`/users/${id}`),

  create: (data: any) =>
    api.post('/users', data),

  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`)
}
