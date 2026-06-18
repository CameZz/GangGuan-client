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
