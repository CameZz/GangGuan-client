// User store - manages authentication and user profile

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import mockApi from '@/utils/mock'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.isAdmin ?? false)
  const isProjectManager = computed(() => isAdmin.value || currentUser.value?.role === 'pm')

  function init() {
    isLoading.value = true
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        currentUser.value = JSON.parse(savedUser)
      } catch {
        localStorage.removeItem('currentUser')
      }
    }
    isLoading.value = false
  }

  function login(employeeId: string, password: string): boolean {
    const user = mockApi.getUserByEmployeeId(employeeId)
    if (user && user.password === password) {
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
      return true
    }
    return false
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('currentUser')
  }

  function updateProfile(data: Partial<User>) {
    if (!currentUser.value) return null

    const updated = mockApi.updateUser(currentUser.value.id, data)
    if (updated) {
      currentUser.value = updated
      localStorage.setItem('currentUser', JSON.stringify(updated))
    }
    return updated
  }

  function createUser(data: Omit<User, 'id'>): User | null {
    if (!currentUser.value?.isAdmin) return null
    return mockApi.createUser(data)
  }

  function deleteUser(id: string): boolean {
    if (!currentUser.value?.isAdmin) return false
    return mockApi.deleteUser(id)
  }

  function getAllUsers(): User[] {
    return mockApi.getUsers()
  }

  return {
    currentUser,
    isLoading,
    isLoggedIn,
    isAdmin,
    isProjectManager,
    init,
    login,
    logout,
    updateProfile,
    createUser,
    deleteUser,
    getAllUsers
  }
})
