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

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const isChangingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

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

async function handleSave() {
  if (!currentUser.value) return

  const updated = await userStore.updateProfile({
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

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!passwordForm.value.oldPassword) {
    passwordError.value = '请输入旧密码'
    return
  }

  if (!passwordForm.value.newPassword) {
    passwordError.value = '请输入新密码'
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = '新密码长度不能少于6位'
    return
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致'
    return
  }

  const updated = await userStore.changePassword(
    passwordForm.value.oldPassword,
    passwordForm.value.newPassword
  )

  if (updated) {
    passwordSuccess.value = '密码修改成功'
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    setTimeout(() => {
      passwordSuccess.value = ''
      isChangingPassword.value = false
    }, 3000)
  } else {
    passwordError.value = '密码修改失败，请确认旧密码是否正确'
  }
}

function cancelPasswordChange() {
  isChangingPassword.value = false
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  passwordError.value = ''
  passwordSuccess.value = ''
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
            <button class="btn btn-secondary" @click="isChangingPassword = true">
              修改密码
            </button>
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

    <!-- Password Change Modal -->
    <div v-if="isChangingPassword" class="modal-overlay" @click.self="cancelPasswordChange">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">修改密码</h2>
          <button class="btn btn-ghost" @click="cancelPasswordChange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">旧密码</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              class="input"
              placeholder="请输入旧密码"
            />
          </div>
          <div class="form-group">
            <label class="label">新密码</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              class="input"
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <div class="form-group">
            <label class="label">确认新密码</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="input"
              placeholder="请再次输入新密码"
            />
          </div>
          <div v-if="passwordError" class="error-message">
            {{ passwordError }}
          </div>
          <div v-if="passwordSuccess" class="success-message">
            {{ passwordSuccess }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelPasswordChange">
            取消
          </button>
          <button class="btn btn-primary" @click="handleChangePassword">
            确认修改
          </button>
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

/* Modal styles */
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
  z-index: 100;
}

.modal {
  width: 100%;
  max-width: 400px;
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.success-message {
  padding: 10px;
  background-color: var(--color-success-light);
  color: var(--color-success);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}
</style>
