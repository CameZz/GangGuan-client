<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Member, User } from '@/types'
import { useMemberStore, useProjectStore, usePlanningStore, useTaskStore, useUserStore } from '@/stores'

const props = defineProps<{
  isOpen: boolean
  projectId?: string
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [data: {
    title: string
    remark: string
    phaseSnapshot: { name: string; assigneeId: string | null }[]
    projectId: string
    planningId: string
    parentRequirementId?: string | null
    assignedReviewerId: string
  }]
}>()

const memberStore = useMemberStore()
const projectStore = useProjectStore()
const planningStore = usePlanningStore()
const taskStore = useTaskStore()
const userStore = useUserStore()

const members = computed(() => {
  const projectId = currentProjectId.value
  if (projectId) {
    return projectStore.getProjectMemberUsers(projectId)
  }
  return memberStore.members
})

// PM/Admin 用户列表（用于审批人选择）
const pmAndAdminUsers = ref<User[]>([])
const selectedReviewerId = ref<string>('')

// 加载审批人候选人列表（项目成员中的 PM + 管理员）
async function loadPmAndAdminUsers() {
  try {
    const projectId = currentProjectId.value
    if (projectId) {
      const reviewers = await projectStore.fetchReviewerCandidates(projectId)
      pmAndAdminUsers.value = reviewers
    } else {
      const allUsers = await userStore.getAllUsers()
      pmAndAdminUsers.value = allUsers.filter(u => u.isAdmin || u.role === 'pm')
    }
  } catch (error) {
    console.error('加载审批人列表失败:', error)
  }
}

// 获取项目的默认审批人
const currentProject = computed(() => projectStore.currentProject)
const defaultReviewerId = computed(() => currentProject.value?.defaultReviewerId || '')

const form = ref({
  title: '',
  remark: '',
  planningId: '',
  parentRequirementId: '' as string | null
})

// 阶段选择相关
const selectedPhaseNames = ref<Set<string>>(new Set())
const phaseAssignments = ref<{ name: string; assigneeId: string | null }[]>([])

const currentProjectId = computed(() => props.projectId || currentProject.value?.id)

// 当前项目的迭代列表
const plannings = computed(() => {
  if (!currentProjectId.value) return []
  return planningStore.plannings.filter(p => p.projectId === currentProjectId.value)
})

// 当前项目的需求单列表
const requirements = computed(() => {
  if (!currentProjectId.value) return []
  return taskStore.getRequirementsByProject(currentProjectId.value)
    .filter(r => !form.value.planningId || r.planningId === form.value.planningId)
})

// 阶段模板列表（所有启用的）
const enabledTemplates = computed(() => {
  if (!currentProject.value) return []
  return (currentProject.value.phaseTemplates || [])
    .filter(t => t.enabled)
    .sort((a, b) => a.order - b.order)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = { title: '', remark: '', planningId: '', parentRequirementId: '' }
    selectedPhaseNames.value = new Set()
    phaseAssignments.value = []
    // 设置默认审批人
    selectedReviewerId.value = defaultReviewerId.value || ''
    // 加载 PM/Admin 用户列表
    loadPmAndAdminUsers()
  }
})

// 当勾选阶段变化时，同步更新 phaseAssignments
watch(selectedPhaseNames, (names) => {
  // 保留已有的 assigneeId
  const existingMap = new Map(phaseAssignments.value.map(p => [p.name, p.assigneeId]))
  phaseAssignments.value = [...names].map(name => ({
    name,
    assigneeId: existingMap.get(name) || null
  }))
}, { deep: true })

function togglePhase(phaseName: string) {
  const newSet = new Set(selectedPhaseNames.value)
  if (newSet.has(phaseName)) {
    newSet.delete(phaseName)
  } else {
    newSet.add(phaseName)
  }
  selectedPhaseNames.value = newSet
}

function updateAssignee(index: number, assigneeId: string | null) {
  phaseAssignments.value[index].assigneeId = assigneeId
}

const titleError = ref('')
const remarkError = ref('')
const planningError = ref('')
const reviewerError = ref('')

function requestClose() {
  if (props.saving) return
  emit('close')
}

function handleSubmit() {
  if (props.saving) return

  // 校验
  titleError.value = ''
  remarkError.value = ''
  planningError.value = ''
  reviewerError.value = ''

  let hasError = false

  if (!form.value.title.trim()) {
    titleError.value = '请输入标题'
    hasError = true
  }
  if (!form.value.remark.trim()) {
    remarkError.value = '请输入申请理由'
    hasError = true
  }
  if (!form.value.planningId) {
    planningError.value = '请选择所属迭代'
    hasError = true
  }
  if (!selectedReviewerId.value) {
    reviewerError.value = '请选择审批人'
    hasError = true
  }

  if (hasError) return

  const projectId = currentProjectId.value
  if (!projectId) return

  emit('save', {
    title: form.value.title.trim(),
    remark: form.value.remark.trim(),
    phaseSnapshot: phaseAssignments.value.map(p => ({
      name: p.name,
      assigneeId: p.assigneeId
    })),
    projectId,
    planningId: form.value.planningId,
    parentRequirementId: form.value.parentRequirementId || null,
    assignedReviewerId: selectedReviewerId.value
  })
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="requestClose">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">申请任务</h2>
        <button class="btn btn-ghost" :disabled="saving" @click="requestClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="label">任务标题 <span class="required">*</span></label>
          <input
            v-model="form.title"
            type="text"
            class="input"
            placeholder="输入任务标题"
            :disabled="saving"
          />
          <span v-if="titleError" class="field-error">{{ titleError }}</span>
        </div>

        <div class="form-group">
          <label class="label">申请理由 <span class="required">*</span></label>
          <textarea
            v-model="form.remark"
            class="input textarea"
            placeholder="说明为什么需要这个任务"
            :disabled="saving"
            rows="3"
          ></textarea>
          <span v-if="remarkError" class="field-error">{{ remarkError }}</span>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="label">所属迭代 <span class="required">*</span></label>
            <select
              v-model="form.planningId"
              class="input select"
              :disabled="saving"
            >
              <option value="">请选择迭代</option>
              <option
                v-for="planning in plannings"
                :key="planning.id"
                :value="planning.id"
              >
                {{ planning.name }}
              </option>
            </select>
            <span v-if="planningError" class="field-error">{{ planningError }}</span>
          </div>

          <div class="form-group flex-1">
            <label class="label">所属需求单 <span class="optional">选填</span></label>
            <select
              v-model="form.parentRequirementId"
              class="input select"
              :disabled="saving"
            >
              <option value="">无</option>
              <option
                v-for="req in requirements"
                :key="req.id"
                :value="req.id"
              >
                {{ req.title }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="label">指定审批人 <span class="required">*</span></label>
          <select
            v-model="selectedReviewerId"
            class="input select"
            :disabled="saving"
          >
            <option value="">请选择审批人</option>
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

        <div class="form-group">
          <label class="label">阶段计划 <span class="optional">选填</span></label>
          <p class="field-hint">勾选需要的阶段，可为每个阶段指定负责人</p>

          <!-- 阶段复选 -->
          <div v-if="enabledTemplates.length > 0" class="phase-checkbox-group">
            <label
              v-for="template in enabledTemplates"
              :key="template.id"
              class="phase-checkbox"
              :class="{ checked: selectedPhaseNames.has(template.name) }"
            >
              <input
                type="checkbox"
                :checked="selectedPhaseNames.has(template.name)"
                :disabled="saving"
                @change="togglePhase(template.name)"
              />
              <span class="phase-checkbox-label">{{ template.name }}</span>
            </label>
          </div>
          <div v-else class="empty-templates">
            暂无阶段模板
          </div>

          <!-- 已选阶段的负责人分配 -->
          <div v-if="phaseAssignments.length > 0" class="phase-list">
            <div
              v-for="(phase, index) in phaseAssignments"
              :key="phase.name"
              class="phase-row"
            >
              <span class="phase-name">{{ phase.name }}</span>
              <select
                :value="phase.assigneeId || ''"
                class="input select"
                :disabled="saving"
                @change="updateAssignee(index, ($event.target as HTMLSelectElement).value || null)"
              >
                <option value="">未分配</option>
                <option
                  v-for="member in members"
                  :key="member.id"
                  :value="member.id"
                >
                  {{ member.name }}（{{ member.role }}）
                </option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <div class="spacer"></div>
        <button class="btn btn-secondary" :disabled="saving" @click="requestClose">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="handleSubmit">
          {{ saving ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 720px);
  overflow: hidden;
}

.modal-header,
.modal-footer {
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

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

.optional {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: normal;
}

.field-error {
  display: block;
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}

.field-hint {
  color: var(--color-text-muted);
  font-size: 12px;
  margin-bottom: 8px;
}

.error-message {
  padding: 10px;
  background-color: var(--color-error-light);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 14px;
  text-align: center;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.phase-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.phase-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  user-select: none;
}

.phase-checkbox:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.phase-checkbox.checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.phase-checkbox input[type="checkbox"] {
  display: none;
}

.phase-checkbox-label {
  white-space: nowrap;
}

.empty-templates {
  color: var(--color-text-muted);
  font-size: 13px;
  padding: 8px 0;
}

.phase-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.phase-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.phase-name {
  flex: 0 0 120px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.phase-row .select {
  flex: 1;
  font-size: 13px;
  padding: 6px 8px;
}
</style>
