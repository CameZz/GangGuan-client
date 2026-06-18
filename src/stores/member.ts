// Member store - manages team member state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Member, User } from '@/types'
import { wsService } from '@/utils/websocket'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])

  const memberCount = computed(() => members.value.length)

  const getMemberById = (id: string): Member | undefined => {
    return members.value.find(m => m.id === id)
  }

  function userToMember(user: User): Member {
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      role: user.role
    }
  }

  function init() {
    // 数据会在 WebSocket sync:init 时设置
  }

  // 从 WebSocket sync:init 设置数据
  function setMembers(users: User[]) {
    members.value = users.map(userToMember)
  }

  function clearData() {
    members.value = []
  }

  wsService.on('user:create', (user: User) => {
    const member = userToMember(user)
    if (!members.value.find(item => item.id === member.id)) {
      members.value.push(member)
    }
  })

  wsService.on('user:update', (user: User) => {
    const member = userToMember(user)
    const index = members.value.findIndex(item => item.id === member.id)
    if (index !== -1) {
      members.value[index] = member
    } else {
      members.value.push(member)
    }
  })

  wsService.on('user:delete', ({ id }: { id: string }) => {
    members.value = members.value.filter(item => item.id !== id)
  })

  return {
    members,
    memberCount,
    getMemberById,
    init,
    setMembers,
    clearData
  }
})
