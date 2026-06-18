// User store - manages authentication and user profile

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { unwrapApiData } from '@/api'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/users'
import { wsService } from '@/utils/websocket'

type UserCreateInput = Omit<User, 'id'> & { password: string }
type UserUpdateInput = Partial<Omit<User, 'id'>> & { password?: string }

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoading = ref(false)
  const hasInitialized = ref(false)
  let initPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.isAdmin ?? false)
  const isProjectManager = computed(() => isAdmin.value || currentUser.value?.role === 'pm')

  async function init(force = false): Promise<void> {
    if (hasInitialized.value && !force) return
    if (initPromise && !force) return initPromise

    initPromise = (async () => {
      isLoading.value = true
      try {
        const data = unwrapApiData<{ user: User }>(await authApi.me() as any)
        currentUser.value = data?.user || null
      } catch {
        currentUser.value = null
      } finally {
        isLoading.value = false
        hasInitialized.value = true
      }
    })().finally(() => {
      initPromise = null
    })

    return initPromise
  }

  async function login(employeeId: string, password: string): Promise<boolean> {
    try {
      const data = unwrapApiData<{ user: User }>(await authApi.login(employeeId, password) as any)
      if (data?.user) {
        currentUser.value = data.user
        hasInitialized.value = true
        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // 忽略登出错误
    }
    wsService.disconnect()
    currentUser.value = null
    hasInitialized.value = true
  }

  async function updateUser(id: string, data: UserUpdateInput): Promise<User | null> {
    if (!currentUser.value) return null
    if (!currentUser.value.isAdmin && currentUser.value.id !== id) return null

    try {
      const result = unwrapApiData<{ user: User }>(await userApi.update(id, data) as any)
      if (result?.user) {
        if (currentUser.value.id === id) {
          currentUser.value = result.user
        }
        return result.user
      }
      return null
    } catch (error) {
      console.error('更新用户信息失败:', error)
      return null
    }
  }

  async function updateProfile(data: UserUpdateInput): Promise<User | null> {
    if (!currentUser.value) return null
    return updateUser(currentUser.value.id, data)
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      await authApi.changePassword(oldPassword, newPassword)
      return true
    } catch (error) {
      console.error('修改密码失败:', error)
      return false
    }
  }

  async function createUser(data: UserCreateInput): Promise<User | null> {
    if (!currentUser.value?.isAdmin) return null

    try {
      const result = unwrapApiData<{ user: User }>(await userApi.create(data) as any)
      return result?.user || null
    } catch (error) {
      console.error('创建用户失败:', error)
      return null
    }
  }

  async function deleteUser(id: string): Promise<boolean> {
    if (!currentUser.value?.isAdmin) return false

    try {
      await userApi.delete(id)
      return true
    } catch (error) {
      console.error('删除用户失败:', error)
      return false
    }
  }

  async function getAllUsers(): Promise<User[]> {
    try {
      const data = unwrapApiData<{ users: User[] }>(await userApi.getAll() as any)
      return data?.users || []
    } catch (error) {
      console.error('获取用户列表失败:', error)
      return []
    }
  }

  wsService.on('user:update', (user: User) => {
    if (currentUser.value?.id === user.id) {
      currentUser.value = user
    }
  })

  wsService.on('user:delete', ({ id }: { id: string }) => {
    if (currentUser.value?.id === id) {
      wsService.disconnect()
      currentUser.value = null
      hasInitialized.value = true
    }
  })

  return {
    currentUser,
    isLoading,
    isLoggedIn,
    isAdmin,
    isProjectManager,
    init,
    login,
    logout,
    updateUser,
    updateProfile,
    changePassword,
    createUser,
    deleteUser,
    getAllUsers
  }
})
