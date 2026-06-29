<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useMemberStore, useProjectStore, storesManager } from '@/stores'
import { ROLES } from '@/types'
import type { User, Project } from '@/types'
import { RoleType } from '@/types'
import MemberManagementModal from '@/components/admin/MemberManagementModal.vue'
import ProjectModal from '@/components/project/ProjectModal.vue'
import { createDefaultPhaseTemplates } from '@/utils/taskPhases'

const router = useRouter()
const userStore = useUserStore()
const memberStore = useMemberStore()
const projectStore = useProjectStore()

async function handleLogout() {
  await storesManager.logout()
  router.push('/login')
}

function goToProjects() {
  router.push('/projects')
}

// Tab state
const activeTab = ref<'users' | 'projects'>('users')

// User management state
const users = ref<User[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')

async function loadUsers() {
  isLoading.value = true
  users.value = await userStore.getAllUsers()
  memberStore.setMembers(users.value)
  isLoading.value = false
}

onMounted(() => {
  loadUsers()
  loadProjects()
})

// Project management state
const projects = ref<Project[]>([])
const isLoadingProjects = ref(false)

async function loadProjects() {
  isLoadingProjects.value = true
  await projectStore.init()
  projects.value = projectStore.projects
  isLoadingProjects.value = false
}

// Member management modal state
const isMemberModalOpen = ref(false)
const selectedProject = ref<Project | null>(null)

function openMemberModal(project: Project) {
  selectedProject.value = project
  isMemberModalOpen.value = true
}

function closeMemberModal() {
  isMemberModalOpen.value = false
  selectedProject.value = null
}

async function handleMemberSave(userIds: string[]) {
  if (!selectedProject.value) return
  const result = await projectStore.updateProjectMembers(selectedProject.value.id, userIds)
  if (result) {
    await loadProjects()
    closeMemberModal()
  }
}

// Project creation/edit state
const isProjectModalOpen = ref(false)
const isCreatingProject = ref(false)
const createProjectError = ref('')
const editingProject = ref<Project | null>(null)

function openProjectModal() {
  createProjectError.value = ''
  editingProject.value = null
  isProjectModalOpen.value = true
}

function openEditProjectModal(project: Project) {
  createProjectError.value = ''
  editingProject.value = project
  isProjectModalOpen.value = true
}

function closeProjectModal() {
  if (isCreatingProject.value) return
  isProjectModalOpen.value = false
  createProjectError.value = ''
  editingProject.value = null
}

async function handleProjectSave(projectData: Partial<Project>) {
  if (isCreatingProject.value) return

  const name = projectData.name?.trim()
  if (!name) {
    createProjectError.value = '请输入项目名称'
    return
  }

  if (!projectData.defaultReviewerId) {
    createProjectError.value = '请选择默认审批人'
    return
  }

  createProjectError.value = ''
  isCreatingProject.value = true

  if (editingProject.value) {
    // Edit mode
    const project = await projectStore.updateProject(editingProject.value.id, {
      name,
      description: projectData.description?.trim() || '',
      defaultReviewerId: projectData.defaultReviewerId
    })

    isCreatingProject.value = false

    if (!project) {
      createProjectError.value = '保存失败，请稍后重试'
      return
    }
  } else {
    // Create mode
    const project = await projectStore.createProject({
      name,
      description: projectData.description?.trim() || '',
      defaultReviewerId: projectData.defaultReviewerId,
      phaseTemplates: createDefaultPhaseTemplates(),
      nonWorkdays: [],
      extraWorkdays: []
    })

    isCreatingProject.value = false

    if (!project) {
      createProjectError.value = '创建项目失败，请稍后重试'
      return
    }
  }

  await loadProjects()
  closeProjectModal()
}

async function handleProjectDelete(projectId: string) {
  if (confirm('确定要删除该项目吗？')) {
    const success = await projectStore.deleteProject(projectId)
    if (success) {
      await loadProjects()
      closeProjectModal()
    } else {
      createProjectError.value = '删除项目失败'
    }
  }
}

// User management functions
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
  role: RoleType.PM,
  avatar: '',
  isAdmin: false
})

function openNewUserModal() {
  selectedUser.value = null
  errorMessage.value = ''
  form.value = {
    employeeId: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    role: RoleType.PM,
    avatar: '',
    isAdmin: false
  }
  isModalOpen.value = true
}

function openEditUserModal(user: User) {
  selectedUser.value = user
  errorMessage.value = ''
  form.value = {
    employeeId: user.employeeId,
    password: '',
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
  errorMessage.value = ''
}

async function handleSave() {
  errorMessage.value = ''
  if (!selectedUser.value && !form.value.password) {
    errorMessage.value = '请输入密码'
    return
  }

  isSaving.value = true
  const payload = {
    employeeId: form.value.employeeId,
    name: form.value.name,
    phone: form.value.phone,
    email: form.value.email,
    role: form.value.role,
    avatar: form.value.avatar,
    isAdmin: form.value.isAdmin,
    ...(form.value.password ? { password: form.value.password } : {})
  }

  const saved = selectedUser.value
    ? await userStore.updateUser(selectedUser.value.id, payload)
    : await userStore.createUser({ ...payload, password: form.value.password })

  isSaving.value = false

  if (!saved) {
    errorMessage.value = '保存失败，请稍后重试'
    return
  }

  await loadUsers()
  closeModal()
}

async function handleDelete(userId: string) {
  if (confirm('确定要删除该用户吗？')) {
    const success = await userStore.deleteUser(userId)
    if (!success) {
      errorMessage.value = '删除失败，请稍后重试'
      return
    }
    await loadUsers()
    closeModal()
  }
}

function getRoleName(roleType: RoleType): string {
  const role = ROLES.find(r => r.type === roleType)
  return role?.name || roleType
}
</script>

<template>
  <div class="project-select-page">
    <header class="page-header">
      <div class="header-left">
        <h1 class="logo">钢 管 系 统</h1>
        <span class="user-greeting">项目管理</span>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" @click="goToProjects">返回项目列表</button>
        <button class="btn btn-ghost" @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="admin-content">
      <!-- Tab Navigation -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          用户管理
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'projects' }"
          @click="activeTab = 'projects'"
        >
          项目管理
        </button>
      </div>

      <!-- User Management Tab -->
    <div v-show="activeTab === 'users'">
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
    </div>

    <!-- Project Management Tab -->
    <div v-show="activeTab === 'projects'">
      <div class="page-header">
        <div class="header-content">
        </div>
        <div class="header-actions">
          <button class="btn btn-primary btn-same-size" @click="openProjectModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建项目
          </button>
        </div>
      </div>

      <div class="projects-section">
        <div v-if="isLoadingProjects" class="loading-state">
          加载中...
        </div>
        <div v-else-if="projects.length === 0" class="empty-state">
          暂无项目
        </div>
        <div v-else class="projects-table">
          <table>
            <thead>
              <tr>
                <th>项目名称</th>
                <th>成员数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in projects" :key="project.id">
                <td>{{ project.name }}</td>
                <td>{{ project.members?.length || 0 }}人</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-ghost btn-sm" @click="openEditProjectModal(project)">
                      编辑
                    </button>
                    <button class="btn btn-ghost btn-sm" @click="openMemberModal(project)">
                      管理成员
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="selectedUser" class="btn btn-danger" :disabled="isSaving" @click="handleDelete(selectedUser.id)">
            删除
          </button>
          <div class="spacer"></div>
          <button class="btn btn-secondary" :disabled="isSaving" @click="closeModal">取消</button>
          <button class="btn btn-primary" :disabled="isSaving" @click="handleSave">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Member Management Modal -->
    <MemberManagementModal
      v-if="selectedProject"
      :is-open="isMemberModalOpen"
      :project="selectedProject"
      @close="closeMemberModal"
      @save="handleMemberSave"
    />

    <!-- Project Creation/Edit Modal -->
    <ProjectModal
      :is-open="isProjectModalOpen"
      :project="editingProject"
      :saving="isCreatingProject"
      :error="createProjectError"
      @close="closeProjectModal"
      @save="handleProjectSave"
      @delete="handleProjectDelete"
    />
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 100%;
  width: 100%;
  min-height: 100vh;
  background-color: var(--color-bg-secondary);
}

.admin-content {
  padding: 2px 5%;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.user-greeting {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 0 0 6px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}

.tab {
  padding: 10px 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-primary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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
  min-width: 160px;
  height: 38px;
}

.btn-same-size {
  height: 38px;
  width: auto;
  min-width: 120px;
  padding: 0 16px;
  white-space: nowrap;
}

/* Users Section */
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
  max-height: calc(100vh - 250px);
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

/* Projects Section */
.projects-section {
  min-height: 200px;
}

.projects-table {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}

.projects-table::-webkit-scrollbar {
  width: 6px;
}

.projects-table::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
}

.projects-table::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-muted);
  font-size: 14px;
}

/* Table styles */
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

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 8px;
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

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
