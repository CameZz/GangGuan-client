<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores'
import { ROLES } from '@/types'
import type { User, RoleType } from '@/types'

const userStore = useUserStore()

const users = computed(() => userStore.getAllUsers())
const selectedRole = ref<string>('')

const filteredUsers = computed(() => {
  if (!selectedRole.value) return users.value
  return users.value.filter(u => u.role === selectedRole.value)
})

const isModalOpen = ref(false)
const selectedUser = ref<User | null>(null)

const form = ref({
  employeeId: '',
  password: '',
  name: '',
  phone: '',
  email: '',
  role: 'pm' as RoleType,
  avatar: '',
  isAdmin: false
})

function openNewUserModal() {
  selectedUser.value = null
  form.value = {
    employeeId: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    role: 'pm',
    avatar: '',
    isAdmin: false
  }
  isModalOpen.value = true
}

function openEditUserModal(user: User) {
  selectedUser.value = user
  form.value = {
    employeeId: user.employeeId,
    password: user.password,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    isAdmin: user.isAdmin
  }
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedUser.value = null
}

function handleSave() {
  if (selectedUser.value) {
    userStore.updateProfile({
      ...form.value,
      id: selectedUser.value.id
    } as Partial<User>)
  } else {
    userStore.createUser(form.value)
  }
  closeModal()
}

function handleDelete(userId: string) {
  if (confirm('确定要删除该用户吗？')) {
    userStore.deleteUser(userId)
    closeModal()
  }
}

function getRoleName(roleType: RoleType): string {
  const role = ROLES.find(r => r.type === roleType)
  return role?.name || roleType
}
</script>

<template>
  <div class="page admin-page">
    <div class="page-header">
      <div class="header-content">
      </div>
      <div class="header-actions">
        <select v-model="selectedRole" class="input select role-filter">
          <option value="">全部角色</option>
          <option v-for="role in ROLES" :key="role.type" :value="role.type">
            {{ role.name }}
          </option>
        </select>
        <button class="btn btn-primary btn-same-size" @click="openNewUserModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建用户
        </button>
      </div>
    </div>

    <div class="users-section">
      <div class="users-table">
        <table>
          <thead>
            <tr>
              <th>工号</th>
              <th>姓名</th>
              <th>角色</th>
              <th>手机号</th>
              <th>邮箱</th>
              <th>权限</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>{{ user.employeeId }}</td>
              <td>
                <div class="user-cell">
                  <img :src="user.avatar" :alt="user.name" class="user-avatar" />
                  <span>{{ user.name }}</span>
                </div>
              </td>
              <td>{{ getRoleName(user.role) }}</td>
              <td>{{ user.phone }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span v-if="user.isAdmin" class="badge badge-admin">管理员</span>
                <span v-else class="badge badge-user">普通用户</span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openEditUserModal(user)">
                  编辑
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedUser ? '编辑用户' : '新建用户' }}</h2>
          <button class="btn btn-ghost" @click="closeModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="label">工号</label>
              <input
                v-model="form.employeeId"
                type="text"
                class="input"
                placeholder="请输入工号"
              />
            </div>
            <div class="form-group">
              <label class="label">密码</label>
              <input
                v-model="form.password"
                type="password"
                class="input"
                :placeholder="selectedUser ? '留空则不修改' : '请输入密码'"
              />
            </div>
          </div>
          <div class="form-group">
            <label class="label">姓名</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="请输入姓名"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">手机号</label>
              <input
                v-model="form.phone"
                type="text"
                class="input"
                placeholder="请输入手机号"
              />
            </div>
            <div class="form-group">
              <label class="label">邮箱</label>
              <input
                v-model="form.email"
                type="email"
                class="input"
                placeholder="请输入邮箱"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">角色</label>
              <select v-model="form.role" class="input select">
                <option v-for="role in ROLES" :key="role.type" :value="role.type">
                  {{ role.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="label">权限</label>
              <select v-model="form.isAdmin" class="input select">
                <option :value="false">普通用户</option>
                <option :value="true">管理员</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="label">头像URL</label>
            <input
              v-model="form.avatar"
              type="text"
              class="input"
              placeholder="头像URL（可选）"
            />
          </div>
          <div v-if="form.avatar" class="avatar-preview">
            <img :src="form.avatar" alt="Avatar preview" />
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="selectedUser" class="btn btn-danger" @click="handleDelete(selectedUser.id)">
            删除
          </button>
          <div class="spacer"></div>
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 100%;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.header-content {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.role-filter {
  min-width: 120px;
  height: 38px;
}

.btn-same-size {
  height: 38px;
  width: auto;
  min-width: 120px;
  padding: 0 16px;
  white-space: nowrap;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.users-table {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  max-height: calc(100vh - 190px);
  overflow-y: auto;
}

.users-table::-webkit-scrollbar {
  width: 6px;
}

.users-table::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
}

.users-table::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  background-color: var(--color-bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background-color: var(--color-bg-tertiary);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.badge-admin {
  background-color: #fef3c7;
  color: #d97706;
}

.badge-user {
  background-color: #e5e7eb;
  color: #6b7280;
}

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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.select {
  cursor: pointer;
}

.spacer {
  flex: 1;
}

.avatar-preview {
  display: flex;
  justify-content: center;
  padding: 12px;
}

.avatar-preview img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>