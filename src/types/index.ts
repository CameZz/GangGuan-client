// Type definitions for the project management system

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'abandoned'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskItemType = 'requirement' | 'task'
export type TaskPhaseStatus = 'pending' | 'in-progress' | 'done'

// Role types
export type RoleType = 'pm' | 'planner' | 'artist' | 'ui' | 'server' | 'client' | 'devops' | 'animator' | 'sound' | 'tester'

export interface Role {
  type: RoleType
  name: string
  canManageAll: boolean
}

export const ROLES: Role[] = [
  { type: 'pm', name: 'PM', canManageAll: true },
  { type: 'planner', name: '策划', canManageAll: false },
  { type: 'artist', name: '美术', canManageAll: false },
  { type: 'ui', name: 'UI', canManageAll: false },
  { type: 'server', name: '程序(服务端)', canManageAll: false },
  { type: 'client', name: '程序(客户端)', canManageAll: false },
  { type: 'devops', name: '运维', canManageAll: false },
  { type: 'animator', name: '动作/特效', canManageAll: false },
  { type: 'sound', name: '音效', canManageAll: false },
  { type: 'tester', name: '测试', canManageAll: false }
]

// Task stage types
export type TaskStage = 'filed' | 'designing' | 'initial' | 'preliminary' | 'final' | 'finalAcceptance' | 'completed'

export const TASK_STAGES = [
  { value: 'filed', label: '立案' },
  { value: 'designing', label: '设计' },
  { value: 'initial', label: '初版实现' },
  { value: 'preliminary', label: '初步验收' },
  { value: 'final', label: '终版完成' },
  { value: 'finalAcceptance', label: '最终验收' },
  { value: 'completed', label: '完成' }
] as const

export interface ProjectPhaseTemplate {
  id: string
  name: string
  order: number
  enabled: boolean
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  phaseTemplates: ProjectPhaseTemplate[]
  nonWorkdays: string[]    // 应上班但休息的日期（如节假日）
  extraWorkdays: string[]  // 应休息但上班的日期（如加班）
}

export interface Member {
  id: string
  name: string
  avatar: string
  email: string
  role: RoleType
}

export interface User {
  id: string
  employeeId: string        // 工号
  name: string             // 姓名
  phone: string            // 手机号
  email: string            // 邮箱
  avatar: string           // 头像
  role: RoleType           // 角色
  isAdmin: boolean         // 是否为管理员
}

export interface Planning {
  id: string
  name: string
  color: string | null
  deadline: string | null
  projectId: string
  createdAt: string
}

export interface TaskPhase {
  id: string
  templateId: string
  name: string
  order: number
  assigneeId: string | null
  progress: number
  status: TaskPhaseStatus
  startTime: string | null
  endTime: string | null
}

export interface Reference {
  type: 'design' | 'ui' | 'document' | 'link'
  url: string
  title: string
}

export interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: string
}

export interface TaskHistory {
  id: string
  taskId: string
  operatorId: string
  field: string
  oldValue: string
  newValue: string
  createdAt: string
}

export interface TaskProgressHistory {
  id: string
  taskId: string
  phaseId: string
  phaseName: string
  assigneeId: string | null
  operatorId: string
  oldProgress: number
  newProgress: number
  createdAt: string
}

export const HISTORY_FIELD_LABELS: Record<string, string> = {
  status: '状态',
  priority: '优先级',
  stage: '任务阶段',
  phases: '阶段进度',
  assigneeId: '负责人',
  dueDate: '截止日期',
  title: '标题',
  description: '描述'
}

export function formatHistoryValue(field: string, value: string): string {
  if (!value) return '空'
  if (field === 'status') {
    const map: Record<string, string> = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成', 'abandoned': '已废弃' }
    return map[value] || value
  }
  if (field === 'priority') {
    const map: Record<string, string> = { 'low': '低', 'medium': '中', 'high': '高' }
    return map[value] || value
  }
  if (field === 'stage') {
    const stage = TASK_STAGES.find(s => s.value === value)
    return stage?.label || value
  }
  if (field === 'dueDate') {
    return value === '空' ? '空' : new Date(value).toLocaleDateString('zh-CN')
  }
  return value
}

export interface Task {
  id: string
  itemType: TaskItemType
  parentRequirementId: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  projectId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
  stage: TaskStage
  phases: TaskPhase[]
  currentPhaseId: string | null
  planningId: string | null
  references: Reference[]
  comments: Comment[]
}

// Approval request types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface PhaseSnapshotItem {
  name: string
  assigneeId: string | null
}

export interface TaskApprovalRequest {
  id: string
  title: string
  remark: string
  phaseSnapshot: PhaseSnapshotItem[]
  status: ApprovalStatus
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  projectId: string
  planningId: string | null
  parentRequirementId: string | null
  requesterId: string
  reviewerId: string | null
  // 关联数据（API 返回时包含）
  requester?: { id: string; name: string; avatar: string; role: RoleType }
  reviewer?: { id: string; name: string; avatar: string; role: RoleType } | null
  project?: { id: string; name: string }
  planning?: { id: string; name: string; color: string | null } | null
}

// Notification types
export type NotificationType = 'progress_update' | 'behind_progress' | 'comment' | 'reference' | 'approval_submitted' | 'approval_approved' | 'approval_rejected'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  dedupeKey: string | null
  readAt: string | null
  createdAt: string
  recipientId: string
  actorId: string | null
  projectId: string | null
  planningId: string | null
  taskId: string | null
  phaseId: string | null
}

// WebSocket message types
export type WSMessageType =
  | 'task:create' | 'task:update' | 'task:delete'
  | 'project:create' | 'project:update' | 'project:delete'
  | 'member:create' | 'member:update' | 'member:delete'
  | 'planning:create' | 'planning:update' | 'planning:delete'
  | 'user:login' | 'user:logout' | 'user:create' | 'user:update' | 'user:delete'
  | 'sync:init' | 'sync:update'
  | 'notification:create' | 'notification:update' | 'notification:read-all'
  | 'approval:create' | 'approval:update'

export interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: string
}
