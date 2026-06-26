// 认证 API

import api from './index'
import type { User } from '@/types'

export interface LoginResponse {
  user: User
  token: string
}

export const authApi = {
  login: (employeeId: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { employeeId, password }),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  validateToken: (token: string): Promise<{ user: LoginResponse['user'] }> =>
    api.get('/auth/validate-token', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/auth/password', { oldPassword, newPassword })
}
