<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores'
import { ROLES } from '@/types'

const userStore = useUserStore()

const currentUser = computed(() => userStore.currentUser)

const form = ref({
  name: '',
  phone: '',
  email: '',
  avatar: '',
  role: '' as string
})

const isEditing = ref(false)
const saveMessage = ref('')

const initForm = () => {
  if (currentUser.value) {
    form.value = {
      name: currentUser.value.name,
      phone: currentUser.value.phone,
      email: currentUser.value.email,
      avatar: currentUser.value.avatar,
      role: currentUser.value.role
    }
  }
}

initForm()

const getRoleName = (roleType: string): string => {
  const role = ROLES.find(r => r.type === roleType)
  return role?.name || roleType
}

function handleEdit() {
  initForm()
  isEditing.value = true
}

function handleCancel() {
  initForm()
  isEditing.value = false
  saveMessage.value = ''
}

function handleSave() {
  if (!currentUser.value) return

  const updated = userStore.updateProfile({
    name: form.value.name,
    phone: form.value.phone,
    email: form.value.email,
    avatar: form.value.avatar
  })

  if (updated) {
    isEditing.value = false
    saveMessage.value = '保存成功'
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }
}
</script>

<template>
  <div class="page profile-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">个人信息</h1>
        <p class="page-subtitle">管理您的个人信息和账户设置</p>
      </div>
    </div>

    <div class="profile-card">
      <div class="profile-header">
        <img
          :src="currentUser?.avatar"
          :alt="currentUser?.name"
          class="profile-avatar"
        />
        <div class="profile-info">
          <h2 class="profile-name">{{ currentUser?.name }}</h2>
          <span class="role-badge">{{ getRoleName(currentUser?.role || '') }}</span>
          <span v-if="currentUser?.isAdmin" class="admin-badge">管理员</span>
        </div>
      </div>

      <div class="profile-body">
        <div class="info-row">
          <label class="info-label">工号</label>
          <span class="info-value">{{ currentUser?.employeeId }}</span>
        </div>

        <div class="info-row">
          <label class="info-label">姓名</label>
          <input
            v-if="isEditing"
            v-model="form.name"
            type="text"
            class="input"
          />
          <span v-else class="info-value">{{ currentUser?.name }}</span>
        </div>

        <div class="info-row">
          <label class="info-label">手机号</label>
          <input
            v-if="isEditing"
            v-model="form.phone"
            type="text"
            class="input"
          />
          <span v-else class="info-value">{{ currentUser?.phone }}</span>
        </div>

        <div class="info-row">
          <label class="info-label">邮箱</label>
          <input
            v-if="isEditing"
            v-model="form.email"
            type="email"
            class="input"
          />
          <span v-else class="info-value">{{ currentUser?.email }}</span>
        </div>

        <div class="info-row">
          <label class="info-label">头像</label>
          <div v-if="isEditing" class="avatar-edit">
            <input
              v-model="form.avatar"
              type="text"
              class="input"
              placeholder="头像URL"
            />
            <img v-if="form.avatar" :src="form.avatar" alt="Avatar preview" class="avatar-preview" />
          </div>
          <img v-else :src="currentUser?.avatar" alt="Avatar" class="info-avatar" />
        </div>

        <div v-if="saveMessage" class="save-message">
          {{ saveMessage }}
        </div>

        <div class="profile-actions">
          <template v-if="!isEditing">
            <button class="btn btn-primary" @click="handleEdit">
              编辑信息
            </button>
          </template>
          <template v-else>
            <button class="btn btn-secondary" @click="handleCancel">
              取消
            </button>
            <button class="btn btn-primary" @click="handleSave">
              保存
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 800px;
}

.page-header {
  margin-bottom: 24px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.profile-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  color: white;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(255, 255, 255, 0.3);
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
}

.role-badge {
  display: inline-block;
  width: fit-content;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
}

.admin-badge {
  display: inline-block;
  width: fit-content;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: #fbbf24;
  color: #000;
  border-radius: var(--radius-full);
}

.profile-body {
  padding: 32px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-of-type {
  border-bottom: none;
}

.info-label {
  width: 80px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.info-value {
  font-size: 14px;
  color: var(--color-text-primary);
}

.info-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-edit {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.save-message {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--color-success-light);
  color: var(--color-success);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.input {
  flex: 1;
  padding: 8px 12px;
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
</style>