// User store - manages authentication and user profile

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { unwrapApiData, setToken, removeToken, getToken, setSavedUser, removeSavedUser } from '@/api'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/users'
import { wsService } from '@/utils/websocket'
import { WSMessageType } from '@/types'

const LOGOUT_FLAG_KEY = 'gangguan:logged-out'

type UserCreateInput = Omit<User, 'id'> & { password: string }
type UserUpdateInput = Partial<Omit<User, 'id'>> & { password?: string }

function normalizeUser(user: User): User {
  const rawIsAdmin = user.isAdmin as unknown
  return {
    ...user,
    isAdmin: rawIsAdmin === true || rawIsAdmin === 'true' || rawIsAdmin === 1
  }
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoading = ref(false)
  const hasInitialized = ref(false)
  let initPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.isAdmin === true)
  const isProjectManager = computed(() => isAdmin.value || currentUser.value?.role === 'pm')

  async function init(force = false): Promise<void> {
    if (hasInitialized.value && !force) return
    if (initPromise && !force) return initPromise

    initPromise = (async () => {
      isLoading.value = true
      try {
        // 如果刚退出登录，不自动恢复登录状态
        if (sessionStorage.getItem(LOGOUT_FLAG_KEY)) {
          currentUser.value = null
          return
        }

        // 仅通过 cookie 验证登录状态，不自动使用 token
        // token 登录需要用户手动点击"一键登录"
        const data = unwrapApiData<{ user: User }>(await authApi.me())
        currentUser.value = data?.user ? normalizeUser(data.user) : null
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

  async function login(employeeId: string, password: string, remember: boolean = false): Promise<boolean> {
    try {
      const response = await authApi.login(employeeId, password)
      const data = unwrapApiData<{ user: User; token: string }>(response)

      if (data?.user) {
        currentUser.value = normalizeUser(data.user)
        hasInitialized.value = true
        sessionStorage.removeItem(LOGOUT_FLAG_KEY)

        // 只有勾选记住我时才记住登录凭据；普通登录会清掉旧设备凭据，避免串号。
        if (remember && data.token) {
          setToken(data.token)
          setSavedUser({ employeeId: data.user.employeeId, name: data.user.name })
        } else {
          removeToken()
          removeSavedUser()
        }

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
    sessionStorage.setItem(LOGOUT_FLAG_KEY, '1')
    wsService.disconnect()
    currentUser.value = null
    hasInitialized.value = true
  }

  // 用户点击一键登录时，才使用本地保存的 remember token 换取 session。
  async function autoLogin(): Promise<boolean> {
    const token = getToken()
    if (!token) {
      removeSavedUser()
      return false
    }

    try {
      const data = unwrapApiData<{ user: User }>(await authApi.validateToken(token))
      if (data?.user) {
        currentUser.value = normalizeUser(data.user)
        hasInitialized.value = true
        sessionStorage.removeItem(LOGOUT_FLAG_KEY)
        return true
      }
      removeToken()
      removeSavedUser()
      return false
    } catch {
      // token 无效，清除
      removeToken()
      removeSavedUser()
      return false
    }
  }

  async function updateUser(id: string, data: UserUpdateInput): Promise<User | null> {
    if (!currentUser.value) return null
    if (!currentUser.value.isAdmin && currentUser.value.id !== id) return null

    try {
      const result = unwrapApiData<{ user: User }>(await userApi.update(id, data) )
      if (result?.user) {
        if (currentUser.value.id === id) {
          currentUser.value = normalizeUser(result.user)
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
      removeToken()
      removeSavedUser()
      return true
    } catch (error) {
      console.error('修改密码失败:', error)
      return false
    }
  }

  async function createUser(data: UserCreateInput): Promise<User | null> {
    if (!currentUser.value?.isAdmin) return null

    try {
      const result = unwrapApiData<{ user: User }>(await userApi.create(data) )
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
      const data = unwrapApiData<{ users: User[] }>(await userApi.getAll() )
      return data?.users || []
    } catch (error) {
      console.error('获取用户列表失败:', error)
      return []
    }
  }

  wsService.on(WSMessageType.UserUpdate, (user: User) => {
    if (currentUser.value?.id === user.id) {
      currentUser.value = normalizeUser(user)
    }
  })

  wsService.on(WSMessageType.UserDelete, ({ id }: { id: string }) => {
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
    autoLogin,
    updateUser,
    updateProfile,
    changePassword,
    createUser,
    deleteUser,
    getAllUsers
  }
})
