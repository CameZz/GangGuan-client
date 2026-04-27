<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Member } from '@/types'
import { useMemberStore, useTaskStore } from '@/stores'
import MemberModal from '@/components/member/MemberModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const memberStore = useMemberStore()
const taskStore = useTaskStore()

const members = computed(() => memberStore.members)

const isModalOpen = ref(false)
const selectedMember = ref<Member | null>(null)

function getMemberTaskCount(memberId: string): number {
  return taskStore.tasks.filter(t => t.assigneeId === memberId).length
}

function getMemberDoneCount(memberId: string): number {
  return taskStore.tasks.filter(t => t.assigneeId === memberId && t.status === 'done').length
}

function openNewMemberModal() {
  selectedMember.value = null
  isModalOpen.value = true
}

function openEditMemberModal(member: Member) {
  selectedMember.value = member
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedMember.value = null
}

function handleSave(memberData: Partial<Member>) {
  if (selectedMember.value) {
    memberStore.updateMember(selectedMember.value.id, memberData)
  } else {
    memberStore.createMember({
      name: memberData.name || '',
      email: memberData.email || '',
      avatar: memberData.avatar || ''
    })
  }
  closeModal()
}

function handleDelete(memberId: string) {
  memberStore.deleteMember(memberId)
  closeModal()
}
</script>

<template>
  <div class="page members-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">团队成员</h1>
        <p class="page-subtitle">管理您的团队并跟踪工作量</p>
      </div>
      <button class="btn btn-primary" @click="openNewMemberModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加成员
      </button>
    </div>

    <div v-if="members.length > 0" class="members-grid">
      <div
        v-for="member in members"
        :key="member.id"
        class="member-card"
        @click="openEditMemberModal(member)"
      >
        <div class="member-header">
          <img :src="member.avatar" :alt="member.name" class="member-avatar" />
          <div class="member-info">
            <h3 class="member-name">{{ member.name }}</h3>
            <p class="member-email">{{ member.email }}</p>
          </div>
        </div>
        <div class="member-stats">
          <div class="stat">
            <span class="stat-value">{{ getMemberTaskCount(member.id) }}</span>
            <span class="stat-label">已分配</span>
          </div>
          <div class="stat">
            <span class="stat-value done">{{ getMemberDoneCount(member.id) }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat">
            <span class="stat-value pending">{{ getMemberTaskCount(member.id) - getMemberDoneCount(member.id) }}</span>
            <span class="stat-label">待处理</span>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="暂无成员"
      description="添加您的第一个团队成员开始使用"
      action-text="添加成员"
      @action="openNewMemberModal"
    />

    <MemberModal
      :is-open="isModalOpen"
      :member="selectedMember"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.members-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.member-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.member-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

.member-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.member-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.member-email {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value.done {
  color: var(--color-success);
}

.stat-value.pending {
  color: var(--color-warning);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}
</style>
