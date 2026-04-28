// Member store - manages team member state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Member } from '@/types'
import mockApi from '@/utils/mock'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const isLoading = ref(false)

  const memberCount = computed(() => members.value.length)

  const getMemberById = (id: string): Member | undefined => {
    return members.value.find(m => m.id === id)
  }

  // Initialize members from mock API
  function init() {
    isLoading.value = true
    members.value = mockApi.getMembers()
    isLoading.value = false
  }

  function createMember(data: Omit<Member, 'id'>) {
    const member = mockApi.createMember({ ...data, role: data.role || 'pm' })
    members.value.push(member)
    return member
  }

  function updateMember(id: string, data: Partial<Member>) {
    const updated = mockApi.updateMember(id, data)
    if (updated) {
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value[index] = updated
      }
    }
    return updated
  }

  function deleteMember(id: string) {
    const success = mockApi.deleteMember(id)
    if (success) {
      members.value = members.value.filter(m => m.id !== id)
    }
    return success
  }

  // Listen for mock events
  mockApi.on('member:create', (member: Member) => {
    if (!members.value.find(m => m.id === member.id)) {
      members.value.push(member)
    }
  })

  mockApi.on('member:update', (member: Member) => {
    const index = members.value.findIndex(m => m.id === member.id)
    if (index !== -1) {
      members.value[index] = member
    }
  })

  mockApi.on('member:delete', ({ id }: { id: string }) => {
    members.value = members.value.filter(m => m.id !== id)
  })

  return {
    members,
    memberCount,
    isLoading,
    getMemberById,
    init,
    createMember,
    updateMember,
    deleteMember
  }
})
