<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Project } from '@/types'

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

const form = ref({
  name: '',
  description: ''
})

watch(() => props.isOpen, (open) => {
  if (open && props.project) {
    form.value = {
      name: props.project.name,
      description: props.project.description
    }
  } else if (open) {
    form.value = {
      name: '',
      description: ''
    }
  }
})

const isEditing = computed(() => !!props.project)

function requestClose() {
  if (props.saving) return
  emit('close')
}

function handleSubmit() {
  if (props.saving) return
  emit('save', form.value)
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

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}
</style>
