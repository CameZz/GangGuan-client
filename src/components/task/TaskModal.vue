<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Task, TaskStatus, TaskPriority, TaskStage, Participant, Reference, Comment, RoleType } from '@/types'
import { useProjectStore, useMemberStore, usePlanningStore } from '@/stores'
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

const projectStore = useProjectStore()
const memberStore = useMemberStore()
const planningStore = usePlanningStore()

const projects = computed(() => projectStore.projects)
const members = computed(() => memberStore.members)
const plannings = computed(() => planningStore.plannings)

const form = ref({
  title: '',
  description: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  projectId: '',
  assigneeId: null as string | null,
  stage: 'filed' as TaskStage,
  planningId: null as string | null,
  participants: [] as Participant[],
  references: [] as Reference[],
  comments: [] as Comment[]
})

const activeTab = ref<'main' | 'participants' | 'references' | 'comments'>('main')

watch(() => props.isOpen, (open) => {
  if (open && props.task) {
    form.value = {
      title: props.task.title,
      description: props.task.description,
      status: props.task.status,
      priority: props.task.priority,
      dueDate: props.task.dueDate ? props.task.dueDate.split('T')[0] : '',
      projectId: props.task.projectId,
      assigneeId: props.task.assigneeId,
      stage: props.task.stage || 'filed',
      planningId: props.task.planningId || null,
      participants: [...(props.task.participants || [])],
      references: [...(props.task.references || [])],
      comments: [...(props.task.comments || [])]
    }
  } else if (open) {
    const defaultProjectId = projects.value[0]?.id || ''
    form.value = {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      projectId: defaultProjectId,
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

const projectPlannings = computed(() => {
  if (!form.value.projectId) return []
  return plannings.value.filter(p => p.projectId === form.value.projectId)
})

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
      </div>

      <div class="modal-body">
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
              <label class="label">规划</label>
              <select v-model="form.planningId" class="input select">
                <option :value="null">无规划</option>
                <option v-for="planning in projectPlannings" :key="planning.id" :value="planning.id">
                  {{ planning.name }}
                </option>
              </select>
            </div>
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
</style>