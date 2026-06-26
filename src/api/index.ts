// API 基础配置

import axios from 'axios'
import { getApiBaseUrl } from '@/utils/config'

export interface ApiEnvelope<T> {
  data?: T
  error?: {
    message?: string
  }
  message?: string
}

export function unwrapApiData<T>(response: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!response) return null
  if (typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data ?? null
  }
  return response as T
}

const TOKEN_KEY = 'gangguan:auth-token'
const SAVED_USER_KEY = 'gangguan:saved-user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export interface SavedUser {
  employeeId: string
  name: string
}

export function getSavedUser(): SavedUser | null {
  try {
    const raw = localStorage.getItem(SAVED_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSavedUser(user: SavedUser): void {
  localStorage.setItem(SAVED_USER_KEY, JSON.stringify(user))
}

export function removeSavedUser(): void {
  localStorage.removeItem(SAVED_USER_KEY)
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000
})

export function configureApiBaseUrl(): void {
  api.defaults.baseURL = getApiBaseUrl()
}

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error?.message || error.response?.data?.message || error.message || '网络错误'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

export default api
