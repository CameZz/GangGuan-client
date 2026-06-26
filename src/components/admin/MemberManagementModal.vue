<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Project, User } from '@/types'
import { useUserStore, useProjectStore } from '@/stores'

const props = defineProps<{
  isOpen: boolean
  project: Project
}>()

const emit = defineEmits<{
  close: []
  save: [userIds: string[]]
}>()

const userStore = useUserStore()
const projectStore = useProjectStore()

const allUsers = ref<User[]>([])
const selectedUserIds = ref<Set<string>>(new Set())
const searchQuery = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// Load users and current members when modal opens
watch(() => props.isOpen, async (open) => {
  if (!open) return

  console.log('[MemberModal] Opening modal for project:', props.project.id)
  isLoading.value = true
  errorMessage.value = ''
  searchQuery.value = ''

  try {
    // Load all users
    console.log('[MemberModal] Loading all users...')
    allUsers.value = await userStore.getAllUsers()
    console.log('[MemberModal] Loaded users:', allUsers.value.length)

    // Load current project members
    console.log('[MemberModal] Loading project members...')
    const members = await projectStore.fetchProjectMembers(props.project.id)
    console.log('[MemberModal] Loaded members:', members.length)
    selectedUserIds.value = new Set(members.map(m => m.id))
  } catch (error) {
    console.error('[MemberModal] Failed to load data:', error)
    errorMessage.value = '加载数据失败'
  } finally {
    isLoading.value = false
  }
}, { immediate: true })

// Filter users based on search query
const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return allUsers.value

  return allUsers.value.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.employeeId.toLowerCase().includes(query)
  )
})

// Split into selected and available
const selectedUsers = computed(() => {
  return filteredUsers.value.filter(u => selectedUserIds.value.has(u.id))
})

const availableUsers = computed(() => {
  return filteredUsers.value.filter(u => !selectedUserIds.value.has(u.id))
})

const selectedCount = computed(() => selectedUserIds.value.size)

function toggleUser(userId: string) {
  const newSet = new Set(selectedUserIds.value)
  if (newSet.has(userId)) {
    newSet.delete(userId)
  } else {
    newSet.add(userId)
  }
  selectedUserIds.value = newSet
}

function removeUser(userId: string) {
  const newSet = new Set(selectedUserIds.value)
  newSet.delete(userId)
  selectedUserIds.value = newSet
}

async function handleSave() {
  isSaving.value = true
  errorMessage.value = ''

  try {
    emit('save', [...selectedUserIds.value])
  } catch (error: any) {
    errorMessage.value = error.message || '保存失败'
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  if (!isSaving.value) {
    emit('close')
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ project.name }} - 成员管理</h2>
        <button class="btn btn-ghost" :disabled="isSaving" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Search -->
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="input search-input"
            placeholder="搜索用户姓名或工号..."
          />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          加载中...
        </div>

        <!-- User List -->
        <div v-else class="user-list">
          <!-- Selected Members -->
          <div v-if="selectedUsers.length > 0" class="user-section">
            <div class="section-label">当前成员 ({{ selectedUsers.length }})</div>
            <div class="user-items">
              <div
                v-for="user in selectedUsers"
                :key="user.id"
                class="user-item selected"
              >
                <label class="user-checkbox">
                  <input
                    type="checkbox"
                    :checked="true"
                    @change="toggleUser(user.id)"
                  />
                  <span class="user-info">
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-id">{{ user.employeeId }}</span>
                  </span>
                </label>
                <button class="btn-remove" @click="removeUser(user.id)" title="移除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Available Users -->
          <div v-if="availableUsers.length > 0" class="user-section">
            <div class="section-label">可添加用户 ({{ availableUsers.length }})</div>
            <div class="user-items">
              <div
                v-for="user in availableUsers"
                :key="user.id"
                class="user-item"
              >
                <label class="user-checkbox">
                  <input
                    type="checkbox"
                    :checked="false"
                    @change="toggleUser(user.id)"
                  />
                  <span class="user-info">
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-id">{{ user.employeeId }}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- No results -->
          <div v-if="selectedUsers.length === 0 && availableUsers.length === 0" class="empty-state">
            {{ searchQuery ? '未找到匹配的用户' : '暂无用户' }}
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <span class="selected-count">已选 {{ selectedCount }} 人</span>
        <div class="spacer" />
        <button class="btn btn-secondary" :disabled="isSaving" @click="handleClose">取消</button>
        <button class="btn btn-primary" :disabled="isSaving || isLoading" @click="handleSave">
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 110;
}

.modal {
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  gap: 12px;
}

.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Search */
.search-box {
  position: relative;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
}

.search-input {
  width: 100%;
  padding-left: 36px !important;
}

/* User List */
.user-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.user-section {
  margin-bottom: 16px;
}

.user-section .user-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}

.user-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
}

.user-item:hover {
  border-color: var(--color-primary);
}

.user-item.selected {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
}

.user-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.user-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  color: var(--color-text-primary);
}

.user-id {
  font-size: 12px;
  color: var(--color-text-muted);
}

.btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-remove:hover {
  background-color: var(--color-error-light);
  color: var(--color-error);
}

/* Footer */
.selected-count {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.spacer {
  flex: 1;
}

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
}

.input {
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--color-text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background-color: var(--color-bg-tertiary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
