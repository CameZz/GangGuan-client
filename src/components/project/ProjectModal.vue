<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Project, User } from '@/types'
import { useUserStore } from '@/stores'

const props = defineProps<{
  project?: Project | null
  isOpen: boolean
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [project: Partial<Project>]
  delete: [id: string]
}>()

const userStore = useUserStore()

const form = ref({
  name: '',
  description: '',
  defaultReviewerId: '' as string | null
})

// PM/Admin 用户列表
const pmAndAdminUsers = ref<User[]>([])

async function loadPmAndAdminUsers() {
  try {
    const allUsers = await userStore.getAllUsers()
    pmAndAdminUsers.value = allUsers.filter(u => u.isAdmin || u.role === 'pm')
  } catch (error) {
    console.error('加载审批人列表失败:', error)
  }
}

const reviewerError = ref('')

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.project) {
      form.value = {
        name: props.project.name,
        description: props.project.description,
        defaultReviewerId: props.project.defaultReviewerId || ''
      }
    } else {
      form.value = {
        name: '',
        description: '',
        defaultReviewerId: ''
      }
    }
    reviewerError.value = ''
    loadPmAndAdminUsers()
  }
})

const isEditing = computed(() => !!props.project)

function requestClose() {
  if (props.saving) return
  emit('close')
}

function handleSubmit() {
  if (props.saving) return

  reviewerError.value = ''

  if (!form.value.defaultReviewerId) {
    reviewerError.value = '请选择默认审批人'
    return
  }

  emit('save', {
    name: form.value.name,
    description: form.value.description,
    defaultReviewerId: form.value.defaultReviewerId
  })
}

function handleDelete() {
  if (!props.saving && props.project?.id) {
    emit('delete', props.project.id)
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="requestClose">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing ? '编辑项目' : '新建项目' }}</h2>
        <button class="btn btn-ghost" :disabled="saving" @click="requestClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="label">项目名称</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="输入项目名称"
            :disabled="saving"
          />
        </div>
        <div class="form-group">
          <label class="label">描述</label>
          <textarea
            v-model="form.description"
            class="input textarea"
            placeholder="输入项目描述"
            :disabled="saving"
          ></textarea>
        </div>
        <div class="form-group">
          <label class="label">默认审批人 <span class="required">*</span></label>
          <select
            v-model="form.defaultReviewerId"
            class="input select"
            :disabled="saving"
          >
            <option value="">请选择默认审批人</option>
            <option
              v-for="user in pmAndAdminUsers"
              :key="user.id"
              :value="user.id"
            >
              {{ user.name }}（{{ user.role === 'pm' ? 'PM' : '管理员' }}）
            </option>
          </select>
          <span v-if="reviewerError" class="field-error">{{ reviewerError }}</span>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button v-if="isEditing" class="btn btn-danger" :disabled="saving" @click="handleDelete">删除</button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" :disabled="saving" @click="requestClose">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="handleSubmit">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spacer {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 8px;
}

.required {
  color: var(--color-error);
}

.field-error {
  display: block;
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}
</style>
