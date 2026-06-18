// Member store - manages team member state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Member, User } from '@/types'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])

  const memberCount = computed(() => members.value.length)

  const getMemberById = (id: string): Member | undefined => {
    return members.value.find(m => m.id === id)
  }

  function init() {
    // 数据会在 WebSocket sync:init 时设置
  }

  // 从 WebSocket sync:init 设置数据
  function setMembers(users: User[]) {
    members.value = users.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      role: u.role
    }))
  }

  function clearData() {
    members.value = []
  }

  return {
    members,
    memberCount,
    getMemberById,
    init,
    setMembers,
    clearData
  }
})
