// 认证 API

import api from './index'

export const authApi = {
  login: (employeeId: string, password: string) =>
    api.post('/auth/login', { employeeId, password }),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/auth/password', { oldPassword, newPassword })
}
