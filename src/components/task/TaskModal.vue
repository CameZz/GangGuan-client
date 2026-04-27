<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import { useProjectStore, useMemberStore } from '@/stores'
import MemberAvatar from '@/components/member/MemberAvatar.vue'

const props = defineProps<{
  task?: Task | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [task: Partial<Task>]
  delete: [id: string]
}>()

const projectStore = useProjectStore()
const memberStore = useMemberStore()

const projects = computed(() => projectStore.projects)
const members = computed(() => memberStore.members)

const form = ref({
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  projectId: '',
  assigneeId: null as string | null
})

watch(() => props.isOpen, (open) => {
  if (open && props.task) {
    form.value = {
      title: props.task.title,
      description: props.task.description,
      status: props.task.status,
      priority: props.task.priority,
      dueDate: props.task.dueDate ? props.task.dueDate.split('T')[0] : '',
      projectId: props.task.projectId,
      assigneeId: props.task.assigneeId
    }
  } else if (open) {
    // Reset form for new task
    const defaultProjectId = projects.value[0]?.id || ''
    form.value = {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      projectId: defaultProjectId,
      assigneeId: null
    }
  }
})

const isEditing = computed(() => !!props.task)

function handleSubmit() {
  const taskData: Partial<Task> = {
    ...form.value,
    dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null
  }
  emit('save', taskData)
}

function handleDelete() {
  if (props.task?.id) {
    emit('delete', props.task.id)
  }
}

function selectMember(memberId: string | null) {
  form.value.assigneeId = memberId
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing ? '编辑任务' : '新建任务' }}</h2>
        <button class="btn btn-ghost" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="label">标题</label>
          <input
            v-model="form.title"
            type="text"
            class="input"
            placeholder="输入任务标题"
          />
        </div>
        <div class="form-group">
          <label class="label">描述</label>
          <textarea
            v-model="form.description"
            class="input textarea"
            placeholder="输入任务描述"
          ></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">状态</label>
            <select v-model="form.status" class="input select">
              <option value="todo">待办</option>
              <option value="in-progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">优先级</label>
            <select v-model="form.priority" class="input select">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">项目</label>
            <select v-model="form.projectId" class="input select">
              <option value="">选择项目</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="label">截止日期</label>
            <input v-model="form.dueDate" type="date" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">负责人</label>
          <div class="member-selector">
            <div class="member-list">
              <div
                class="member-option"
                :class="{ selected: form.assigneeId === null }"
                @click="selectMember(null)"
              >
                <MemberAvatar :member="null" size="sm" />
                <span>未分配</span>
              </div>
              <div
                v-for="member in members"
                :key="member.id"
                class="member-option"
                :class="{ selected: form.assigneeId === member.id }"
                @click="selectMember(member.id)"
              >
                <MemberAvatar :member="member" size="sm" />
                <span>{{ member.name }}</span>
              </div>
            </div>
          </div>
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
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.member-selector {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow-y: auto;
}

.member-list {
  padding: 8px;
}

.member-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.member-option:hover {
  background-color: var(--color-bg-tertiary);
}

.member-option.selected {
  background-color: var(--color-primary);
  color: white;
}

.member-option span {
  font-size: 14px;
}

.spacer {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 8px;
}
</style>
