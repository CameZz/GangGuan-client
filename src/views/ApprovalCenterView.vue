<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useApprovalStore, useProjectStore, useUserStore, usePlanningStore, useTaskStore } from '@/stores'
import type { TaskApprovalRequest, ApprovalStatus, PhaseSnapshotItem } from '@/types'
import { ROLES } from '@/types'
import MemberAvatar from '@/components/member/MemberAvatar.vue'
import TaskModal from '@/components/task/TaskModal.vue'

const router = useRouter()
const approvalStore = useApprovalStore()
const projectStore = useProjectStore()
const userStore = useUserStore()
const planningStore = usePlanningStore()
const taskStore = useTaskStore()

const statusFilter = ref<ApprovalStatus | 'all'>('pending')
const projectFilter = ref<string | 'all'>('all')

// 驳回弹框
const showRejectModal = ref(false)
const rejectingId = ref<string | null>(null)
const rejectComment = ref('')
const rejectError = ref('')

// TaskModal 预填
const showTaskModal = ref(false)
const prefilledTask = ref<any>(null)
const approvingId = ref<string | null>(null)
const approveError = ref('')

const isLoading = computed(() => approvalStore.isLoading)
const isProjectManager = computed(() => userStore.isProjectManager)

const projects = computed(() => projectStore.projects)

const filteredApprovals = computed(() => {
  return approvalStore.approvals
})

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回'
}

const STATUS_ICONS: Record<ApprovalStatus, string> = {
  pending: '⏳',
  approved: '✅',
  rejected: '❌'
}

const STATUS_CLASSES: Record<ApprovalStatus, string> = {
  pending: 'status-pending',
  approved: 'status-approved',
  rejected: 'status-rejected'
}

function getRoleName(role: string): string {
  return ROLES.find(r => r.type === role)?.name || role
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatFullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function fetchApprovals() {
  await approvalStore.fetchApprovals({
    status: statusFilter.value,
    projectId: projectFilter.value
  })
}

function handleStatusFilterChange(status: ApprovalStatus | 'all') {
  statusFilter.value = status
  fetchApprovals()
}

function handleProjectFilterChange(projectId: string | 'all') {
  projectFilter.value = projectId
  fetchApprovals()
}

// 审批通过 - 弹出预填 TaskModal
async function handleApprove(approval: TaskApprovalRequest) {
  approveError.value = ''
  approvingId.value = approval.id
  try {
    // 先加载该项目的迭代和任务数据（确保下拉选项有数据）
    await Promise.all([
      planningStore.fetchPlannings(approval.projectId),
      taskStore.fetchTasks(approval.projectId)
    ])

    // 如果 TaskModal 已打开，先关闭再重新打开（强制重新挂载）
    if (showTaskModal.value) {
      showTaskModal.value = false
      prefilledTask.value = null
      await nextTick()
    }

    // 构造预填数据
    const phases = (approval.phaseSnapshot || []).map((p: PhaseSnapshotItem, index: number) => ({
      id: `temp-${index}`,
      templateId: '',
      name: p.name,
      order: index,
      assigneeId: p.assigneeId,
      progress: 0,
      status: 'pending',
      startTime: null,
      endTime: null
    }))

    prefilledTask.value = {
      title: approval.title,
      description: approval.remark,
      phases,
      projectId: approval.projectId,
      planningId: approval.planningId,
      parentRequirementId: approval.parentRequirementId
    }
    showTaskModal.value = true
  } catch (error: any) {
    console.error('打开审批弹框失败:', error)
    approveError.value = error.message || '操作失败，请重试'
    approvingId.value = null
  }
}

// TaskModal 关闭
function handleTaskModalClose() {
  showTaskModal.value = false
  prefilledTask.value = null
  approvingId.value = null
}

// TaskModal 保存（创建任务）
async function handleTaskSave(taskData: any) {
  showTaskModal.value = false
  prefilledTask.value = null

  // 创建任务
  const saved = await taskStore.createTask({
    title: taskData.title || '',
    description: taskData.description || '',
    itemType: taskData.itemType || 'task',
    parentRequirementId: taskData.parentRequirementId || null,
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate || null,
    projectId: taskData.projectId || '',
    assigneeId: taskData.assigneeId || null,
    stage: taskData.stage || 'filed',
    phases: taskData.phases || [],
    currentPhaseId: taskData.currentPhaseId || null,
    planningId: taskData.planningId || null,
    references: taskData.references || [],
    comments: taskData.comments || []
  })

  // 标记审批为通过
  if (saved && approvingId.value) {
    try {
      await approvalStore.approveRequest(approvingId.value)
    } catch (error: any) {
      console.error('审批通过失败:', error)
      approveError.value = error.message || '审批通过失败'
    }
  }
  approvingId.value = null
  // 刷新审批列表
  fetchApprovals()
}

// 审批驳回
function handleRejectClick(id: string) {
  rejectingId.value = id
  rejectComment.value = ''
  rejectError.value = ''
  showRejectModal.value = true
}

function handleRejectCancel() {
  showRejectModal.value = false
  rejectingId.value = null
  rejectComment.value = ''
  rejectError.value = ''
}

async function handleRejectConfirm() {
  if (!rejectingId.value) return
  if (!rejectComment.value.trim()) {
    rejectError.value = '请填写驳回理由'
    return
  }

  try {
    await approvalStore.rejectRequest(rejectingId.value, rejectComment.value.trim())
    handleRejectCancel()
  } catch (error: any) {
    rejectError.value = error.message || '驳回失败'
  }
}

onMounted(() => {
  if (!isProjectManager.value) {
    router.replace('/')
    return
  }
  fetchApprovals()
})
</script>

<template>
  <div class="approval-center">
    <div class="page-header">
      <h1 class="page-title">审批中心</h1>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="status-filters">
        <button
          v-for="status in (['all', 'pending', 'approved', 'rejected'] as const)"
          :key="status"
          class="filter-chip"
          :class="{ active: statusFilter === status }"
          @click="handleStatusFilterChange(status)"
        >
          {{ status === 'all' ? '全部' : STATUS_LABELS[status] }}
        </button>
      </div>
      <div class="project-filter">
        <select
          :value="projectFilter"
          class="input select"
          @change="handleProjectFilterChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="all">全部项目</option>
          <option
            v-for="project in projects"
            :key="project.id"
            :value="project.id"
          >
            {{ project.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredApprovals.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">暂无待审批的申请</p>
    </div>

    <!-- 申请列表 -->
    <div v-else class="approval-list">
      <div
        v-for="approval in filteredApprovals"
        :key="approval.id"
        class="approval-card"
      >
        <div class="card-header">
          <div class="card-title-row">
            <span class="card-title">{{ approval.title }}</span>
            <span class="status-badge" :class="STATUS_CLASSES[approval.status]">
              {{ STATUS_ICONS[approval.status] }} {{ STATUS_LABELS[approval.status] }}
            </span>
          </div>
          <div class="card-meta">
            <div class="requester-info">
              <MemberAvatar
                :name="approval.requester?.name || ''"
                :avatar="approval.requester?.avatar || ''"
                size="sm"
              />
              <span class="requester-name">{{ approval.requester?.name }}</span>
              <span class="requester-role">（{{ getRoleName(approval.requester?.role || '') }}）</span>
            </div>
            <div class="card-time">
              <span v-if="approval.project?.name" class="project-name">{{ approval.project.name }}</span>
              <span>{{ formatTime(approval.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="section">
            <div class="section-label">申请理由</div>
            <div class="section-content">{{ approval.remark }}</div>
          </div>

          <div class="section meta-row">
            <div class="meta-item">
              <span class="meta-label">所属迭代</span>
              <span class="meta-value">{{ approval.planning?.name || '未指定' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">所属需求单</span>
              <span class="meta-value">{{ approval.parentRequirementId ? '已关联' : '无' }}</span>
            </div>
          </div>

          <div v-if="approval.phaseSnapshot && approval.phaseSnapshot.length > 0" class="section">
            <div class="section-label">阶段计划</div>
            <div class="phase-tags">
              <div
                v-for="(phase, index) in approval.phaseSnapshot"
                :key="index"
                class="phase-tag"
              >
                <span class="phase-name">{{ phase.name }}</span>
                <span class="phase-assignee">
                  {{ phase.assigneeId ? '→ 已指定' : '→ 未分配' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="section">
            <div class="section-label">阶段计划</div>
            <div class="section-content empty">未指定阶段计划</div>
          </div>

          <!-- 审批信息 -->
          <div v-if="approval.status !== 'pending' && approval.reviewer" class="section review-info">
            <div class="section-label">
              {{ approval.status === 'approved' ? '通过' : '驳回' }}信息
            </div>
            <div class="section-content">
              <span>{{ approval.reviewer.name }} 于 {{ formatFullTime(approval.reviewedAt || '') }} {{ approval.status === 'approved' ? '通过' : '驳回' }}</span>
              <span v-if="approval.reviewComment" class="review-comment">
                理由：{{ approval.reviewComment }}
              </span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="approveError && approvingId === approval.id" class="approve-error">
          {{ approveError }}
        </div>
        <div v-if="approval.status === 'pending'" class="card-actions">
          <button class="btn btn-primary" @click="handleApprove(approval)">
            ✓ 通过
          </button>
          <button class="btn btn-danger" @click="handleRejectClick(approval.id)">
            ✗ 驳回
          </button>
        </div>
      </div>
    </div>

    <!-- 驳回理由弹框 -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="handleRejectCancel">
      <div class="modal reject-modal">
        <div class="modal-header">
          <h2 class="modal-title">驳回申请</h2>
          <button class="btn btn-ghost" @click="handleRejectCancel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="label">驳回理由 <span class="required">*</span></label>
            <textarea
              v-model="rejectComment"
              class="input textarea"
              placeholder="请说明驳回原因"
              rows="4"
            ></textarea>
            <span v-if="rejectError" class="field-error">{{ rejectError }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <div class="spacer"></div>
          <button class="btn btn-secondary" @click="handleRejectCancel">取消</button>
          <button class="btn btn-danger" @click="handleRejectConfirm">确认驳回</button>
        </div>
      </div>
    </div>

    <!-- 预填 TaskModal -->
    <TaskModal
      v-if="showTaskModal"
      :is-open="showTaskModal"
      :task="null"
      :initial-request="prefilledTask"
      :project-id="prefilledTask?.projectId"
      @close="handleTaskModalClose"
      @save="handleTaskSave"
    />
  </div>
</template>

<style scoped>
.approval-center {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.status-filters {
  display: flex;
  gap: 8px;
}

.filter-chip {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
}

.filter-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-chip.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.project-filter .select {
  min-width: 160px;
  font-size: 13px;
  padding: 6px 8px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--color-text-muted);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  color: var(--color-text-muted);
  font-size: 15px;
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.approval-card {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-approved {
  background-color: #d1fae5;
  color: #065f46;
}

.status-rejected {
  background-color: #fee2e2;
  color: #991b1b;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.requester-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.requester-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.requester-role {
  font-size: 13px;
  color: var(--color-text-muted);
}

.card-time {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.project-name {
  padding: 2px 8px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.card-body {
  padding: 16px 20px;
}

.section {
  margin-bottom: 16px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.section-content {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
}

.section-content.empty {
  color: var(--color-text-muted);
  font-style: italic;
}

.meta-row {
  display: flex;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.phase-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.phase-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
}

.phase-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.phase-assignee {
  color: var(--color-text-muted);
}

.review-info {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.review-comment {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
}

.approve-error {
  padding: 8px 20px;
  color: var(--color-error);
  font-size: 13px;
  background-color: var(--color-bg-secondary);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
}

/* Reject modal */
.reject-modal {
  max-width: 480px;
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

.field-error {
  display: block;
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}
</style>
