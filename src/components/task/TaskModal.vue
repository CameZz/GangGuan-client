<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority, TaskStage, Participant, Reference, Comment, RoleType, TaskHistory } from '@/types'
import { HISTORY_FIELD_LABELS } from '@/types'
import { useMemberStore, usePlanningStore, useTaskStore } from '@/stores'
import { TASK_STAGES, ROLES } from '@/types'
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

const memberStore = useMemberStore()
const planningStore = usePlanningStore()
const taskStore = useTaskStore()

const members = computed(() => memberStore.members)
const plannings = computed(() => planningStore.plannings)

const form = ref({
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  assigneeId: null as string | null,
  stage: 'filed' as TaskStage,
  planningId: null as string | null,
  participants: [] as Participant[],
  references: [] as Reference[],
  comments: [] as Comment[]
})

const activeTab = ref<'main' | 'participants' | 'references' | 'comments' | 'history'>('main')

watch(() => props.isOpen, (open) => {
  if (open && props.task) {
    loadHistories()
    form.value = {
      title: props.task.title,
      description: props.task.description,
      status: props.task.status,
      priority: props.task.priority,
      dueDate: props.task.dueDate ? props.task.dueDate.split('T')[0] : '',
      assigneeId: props.task.assigneeId,
      stage: props.task.stage || 'filed',
      planningId: props.task.planningId || null,
      participants: [...(props.task.participants || [])],
      references: [...(props.task.references || [])],
      comments: [...(props.task.comments || [])]
    }
  } else if (open) {
    form.value = {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      assigneeId: null,
      stage: 'filed',
      planningId: null,
      participants: [
        { roleType: 'pm', memberId: '', startTime: null, endTime: null },
        { roleType: 'tester', memberId: '', startTime: null, endTime: null }
      ],
      references: [],
      comments: []
    }
  }
})

const isEditing = computed(() => !!props.task)

const availableMembers = computed(() => {
  return members.value
})

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
  showMemberDropdown.value = false
}

function addParticipant() {
  form.value.participants.push({
    roleType: 'planner',
    memberId: '',
    startTime: null,
    endTime: null
  })
}

function removeParticipant(index: number) {
  form.value.participants.splice(index, 1)
}

function updateParticipantRole(index: number, roleType: RoleType) {
  form.value.participants[index].roleType = roleType
}

function updateParticipantMember(index: number, memberId: string) {
  form.value.participants[index].memberId = memberId
}

function addReference() {
  form.value.references.push({
    type: 'link',
    url: '',
    title: ''
  })
}

function removeReference(index: number) {
  form.value.references.splice(index, 1)
}

function addComment() {
  const currentUser = members.value[0]
  if (currentUser) {
    form.value.comments.push({
      id: Date.now().toString(),
      authorId: currentUser.id,
      content: '',
      createdAt: new Date().toISOString()
    })
  }
}

function removeComment(index: number) {
  form.value.comments.splice(index, 1)
}

function getMemberName(memberId: string): string {
  const member = members.value.find(m => m.id === memberId)
  return member?.name || '未分配'
}

const taskHistories = ref<TaskHistory[]>([])
const showMemberDropdown = ref(false)

const currentAssignee = computed(() => {
  if (!form.value.assigneeId) return null
  return members.value.find(m => m.id === form.value.assigneeId) || null
})

function loadHistories() {
  if (props.task?.id) {
    taskHistories.value = taskStore.getTaskHistories(props.task.id)
  }
}

function getHistoryFieldLabel(field: string): string {
  return HISTORY_FIELD_LABELS[field] || field
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2 class="modal-title">{{ isEditing ? '编辑任务' : '新建任务' }}</h2>
        <button class="btn btn-ghost" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'main' }"
          @click="activeTab = 'main'"
        >基本信息</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'participants' }"
          @click="activeTab = 'participants'"
        >参与者 ({{ form.participants.length }})</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'references' }"
          @click="activeTab = 'references'"
        >参考资料 ({{ form.references.length }})</button>
        <button
          class="tab"
          :class="{ active: activeTab === 'comments' }"
          @click="activeTab = 'comments'"
        >评论 ({{ form.comments.length }})</button>
        <button
          v-if="isEditing"
          class="tab"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >历史记录</button>
      </div>

      <div class="modal-body" @click="showMemberDropdown = false">
        <div v-show="activeTab === 'main'">
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
                <option value="abandoned">已废弃</option>
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
          <div class="form-group">
            <label class="label">规划</label>
            <select v-model="form.planningId" class="input select">
              <option :value="null">无规划</option>
              <option v-for="planning in plannings" :key="planning.id" :value="planning.id">
                {{ planning.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="label">截止日期</label>
              <input v-model="form.dueDate" type="date" class="input" />
            </div>
            <div class="form-group">
              <label class="label">任务阶段</label>
              <select v-model="form.stage" class="input select">
                <option v-for="stage in TASK_STAGES" :key="stage.value" :value="stage.value">
                  {{ stage.label }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="label">负责人</label>
            <div class="member-selector" @click.stop>
              <div class="member-trigger" @click="showMemberDropdown = !showMemberDropdown">
                <div class="member-trigger-info">
                  <MemberAvatar :member="currentAssignee" size="sm" />
                  <span>{{ currentAssignee?.name || '未分配' }}</span>
                </div>
                <svg class="member-trigger-arrow" :class="{ open: showMemberDropdown }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <div v-show="showMemberDropdown" class="member-dropdown">
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

        <div v-show="activeTab === 'participants'" class="tab-content">
          <div class="participant-list">
            <div
              v-for="(participant, index) in form.participants"
              :key="index"
              class="participant-item"
            >
              <div class="participant-row">
                <select
                  :value="participant.roleType"
                  class="input select"
                  @change="updateParticipantRole(index, ($event.target as HTMLSelectElement).value as RoleType)"
                >
                  <option v-for="role in ROLES" :key="role.type" :value="role.type">
                    {{ role.name }}
                  </option>
                </select>
                <select
                  :value="participant.memberId"
                  class="input select"
                  @change="updateParticipantMember(index, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">选择成员</option>
                  <option v-for="member in availableMembers" :key="member.id" :value="member.id">
                    {{ member.name }}
                  </option>
                </select>
                <button class="btn btn-ghost btn-sm" @click="removeParticipant(index)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="participant-times">
                <input
                  type="date"
                  class="input"
                  :value="participant.startTime ? participant.startTime.split('T')[0] : ''"
                  @change="participant.startTime = ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value).toISOString() : null"
                />
                <span>至</span>
                <input
                  type="date"
                  class="input"
                  :value="participant.endTime ? participant.endTime.split('T')[0] : ''"
                  @change="participant.endTime = ($event.target as HTMLInputElement).value ? new Date(($event.target as HTMLInputElement).value).toISOString() : null"
                />
              </div>
            </div>
          </div>
          <button class="btn btn-secondary" @click="addParticipant">添加参与者</button>
        </div>

        <div v-show="activeTab === 'references'" class="tab-content">
          <div class="reference-list">
            <div
              v-for="(reference, index) in form.references"
              :key="index"
              class="reference-item"
            >
              <select v-model="reference.type" class="input select">
                <option value="design">设计</option>
                <option value="ui">UI</option>
                <option value="document">文档</option>
                <option value="link">链接</option>
              </select>
              <input
                v-model="reference.title"
                type="text"
                class="input"
                placeholder="标题"
              />
              <input
                v-model="reference.url"
                type="text"
                class="input"
                placeholder="URL"
              />
              <button class="btn btn-ghost btn-sm" @click="removeReference(index)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button class="btn btn-secondary" @click="addReference">添加参考资料</button>
        </div>

        <div v-show="activeTab === 'comments'" class="tab-content">
          <div class="comment-list">
            <div
              v-for="(comment, index) in form.comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-header">
                <span class="comment-author">{{ getMemberName(comment.authorId) }}</span>
                <span class="comment-date">{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
              </div>
              <textarea
                v-model="comment.content"
                class="input textarea"
                placeholder="输入评论内容"
              ></textarea>
              <button class="btn btn-ghost btn-sm" @click="removeComment(index)">删除</button>
            </div>
          </div>
          <button class="btn btn-secondary" @click="addComment">添加评论</button>
        </div>

        <div v-show="activeTab === 'history'" class="tab-content">
          <div v-if="taskHistories.length === 0" class="history-empty">暂无变更记录</div>
          <div v-else class="history-list">
            <div
              v-for="history in taskHistories"
              :key="history.id"
              class="history-item"
            >
              <div class="history-dot"></div>
              <div class="history-content">
                <div class="history-text">
                  <span class="history-operator">{{ getMemberName(history.operatorId) }}</span>
                  将
                  <span class="history-field">{{ getHistoryFieldLabel(history.field) }}</span>
                  从
                  <span class="history-old">{{ history.oldValue }}</span>
                  修改为
                  <span class="history-new">{{ history.newValue }}</span>
                </div>
                <div class="history-time">{{ new Date(history.createdAt).toLocaleString('zh-CN') }}</div>
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
.modal-lg {
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: 12px 16px;
  font-size: 14px;
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

.tab-content {
  padding: 16px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.member-selector {
  position: relative;
}

.member-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.member-trigger:hover {
  border-color: var(--color-primary);
}

.member-trigger-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-trigger-info span {
  font-size: 14px;
}

.member-trigger-arrow {
  transition: transform var(--transition-fast);
  color: var(--color-text-muted);
}

.member-trigger-arrow.open {
  transform: rotate(180deg);
}

.member-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  padding: 4px;
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

.participant-list,
.reference-list,
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.participant-item {
  padding: 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.participant-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.participant-row .select {
  flex: 1;
}

.participant-times {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.participant-times .input {
  flex: 1;
}

.participant-times span {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.reference-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reference-item .input {
  flex: 1;
}

.reference-item .select {
  width: 100px;
}

.comment-item {
  padding: 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  font-size: 14px;
}

.comment-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.spacer {
  flex: 1;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

.btn-sm {
  padding: 4px 8px;
}

.history-empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px 0;
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 20px;
}

.history-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background-color: var(--color-border);
}

.history-item {
  display: flex;
  gap: 12px;
  position: relative;
  padding: 8px 0;
}

.history-dot {
  position: absolute;
  left: -20px;
  top: 14px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--color-primary);
  border: 2px solid var(--color-bg-primary);
  z-index: 1;
}

.history-content {
  flex: 1;
  padding: 8px 12px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.history-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.history-operator {
  font-weight: 600;
  color: var(--color-primary);
}

.history-field {
  font-weight: 500;
}

.history-old {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.history-new {
  font-weight: 500;
  color: var(--color-success, #22c55e);
}

.history-time {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>