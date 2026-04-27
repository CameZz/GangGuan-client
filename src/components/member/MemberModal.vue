<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Member } from '@/types'

const props = defineProps<{
  member?: Member | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [member: Partial<Member>]
  delete: [id: string]
}>()

const form = ref({
  name: '',
  email: '',
  avatar: ''
})

watch(() => props.isOpen, (open) => {
  if (open && props.member) {
    form.value = {
      name: props.member.name,
      email: props.member.email,
      avatar: props.member.avatar
    }
  } else if (open) {
    form.value = {
      name: '',
      email: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`
    }
  }
})

const isEditing = computed(() => !!props.member)

function handleSubmit() {
  if (!form.value.avatar) {
    form.value.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.value.name || 'default'}`
  }
  emit('save', form.value)
}

function handleDelete() {
  if (props.member?.id) {
    emit('delete', props.member.id)
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing ? '编辑成员' : '新建成员' }}</h2>
        <button class="btn btn-ghost" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="label">姓名</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="输入成员姓名"
          />
        </div>
        <div class="form-group">
          <label class="label">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="输入邮箱地址"
          />
        </div>
        <div class="form-group">
          <label class="label">头像URL</label>
          <input
            v-model="form.avatar"
            type="text"
            class="input"
            placeholder="头像URL（可选，留空则自动生成）"
          />
          <p class="form-hint">留空将自动生成头像</p>
        </div>
        <div v-if="form.avatar" class="avatar-preview">
          <img :src="form.avatar" alt="Avatar preview" />
        </div>
      </div>
      <div class="modal-footer">
        <button v-if="isEditing" class="btn btn-danger" @click="handleDelete">删除</button>
        <div class="spacer"></div>
        <button class="btn btn-secondary" @click="emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSubmit">保存</button>
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

.form-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.avatar-preview {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.avatar-preview img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}
</style>
