// Member store - manages team member state (delegates to userStore)

import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Member } from '@/types'
import { useUserStore } from './user'

export const useMemberStore = defineStore('member', () => {
  const userStore = useUserStore()

  // Convert User[] to Member[] (User has all Member fields plus extra)
  const members = computed<Member[]>(() =>
    userStore.getAllUsers().map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      role: u.role
    }))
  )

  const memberCount = computed(() => members.value.length)

  const getMemberById = (id: string): Member | undefined => {
    return members.value.find(m => m.id === id)
  }

  function init() {
    // No initialization needed - members are computed from users
  }

  return {
    members,
    memberCount,
    getMemberById,
    init
  }
})
