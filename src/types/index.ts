// Type definitions for the project management system

export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in-progress',
  Done = 'done',
  Abandoned = 'abandoned'
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export enum TaskItemType {
  Requirement = 'requirement',
  Task = 'task'
}

export enum TaskPhaseStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Done = 'done'
}

// Role types
export enum RoleType {
  PM = 'pm',
  Planner = 'planner',
  Artist = 'artist',
  UI = 'ui',
  Server = 'server',
  Client = 'client',
  DevOps = 'devops',
  Animator = 'animator',
  Sound = 'sound',
  Tester = 'tester'
}

export interface Role {
  type: RoleType
  name: string
  canManageAll: boolean
}

export const ROLES: Role[] = [
  { type: RoleType.PM, name: 'PM', canManageAll: true },
  { type: RoleType.Planner, name: '策划', canManageAll: false },
  { type: RoleType.Artist, name: '美术', canManageAll: false },
  { type: RoleType.UI, name: 'UI', canManageAll: false },
  { type: RoleType.Server, name: '程序(服务端)', canManageAll: false },
  { type: RoleType.Client, name: '程序(客户端)', canManageAll: false },
  { type: RoleType.DevOps, name: '运维', canManageAll: false },
  { type: RoleType.Animator, name: '动作/特效', canManageAll: false },
  { type: RoleType.Sound, name: '音效', canManageAll: false },
  { type: RoleType.Tester, name: '测试', canManageAll: false }
]

// Task stage types
export enum TaskStage {
  Filed = 'filed',
  Designing = 'designing',
  Initial = 'initial',
  Preliminary = 'preliminary',
  Final = 'final',
  FinalAcceptance = 'finalAcceptance',
  Completed = 'completed'
}

export enum ReferenceType {
  Design = 'design',
  UI = 'ui',
  Document = 'document',
  Link = 'link'
}

export const TASK_STAGE_LABELS: Record<TaskStage, string> = {
  filed: '立案',
  designing: '设计',
  initial: '初版实现',
  preliminary: '初步验收',
  final: '终版完成',
  finalAcceptance: '最终验收',
  completed: '完成'
}

export const TASK_STAGES = [
  { value: TaskStage.Filed, label: TASK_STAGE_LABELS.filed },
  { value: TaskStage.Designing, label: TASK_STAGE_LABELS.designing },
  { value: TaskStage.Initial, label: TASK_STAGE_LABELS.initial },
  { value: TaskStage.Preliminary, label: TASK_STAGE_LABELS.preliminary },
  { value: TaskStage.Final, label: TASK_STAGE_LABELS.final },
  { value: TaskStage.FinalAcceptance, label: TASK_STAGE_LABELS.finalAcceptance }
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
  defaultReviewerId: string | null
  phaseTemplates: ProjectPhaseTemplate[]
  members?: ProjectMember[]
  nonWorkdays: string[]    // 应上班但休息的日期（如节假日）
  extraWorkdays: string[]  // 应休息但上班的日期（如加班）
}


export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  createdAt: string
  user: User
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
  id?: string
  authorId?: string
  createdAt?: string
  type: ReferenceType
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

export interface DailyNote {
  id: string
  memberId: string
  projectId: string
  dateKey: string
  content: string
  createdAt: string
  updatedAt: string
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
    return TASK_STAGE_LABELS[value as TaskStage] || value
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
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled'
}

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
  assignedReviewerId: string | null
  reviewerId: string | null
  // 关联数据（API 返回时包含）
  requester?: { id: string; name: string; avatar: string; role: RoleType }
  assignedReviewer?: { id: string; name: string; avatar: string; role: RoleType } | null
  reviewer?: { id: string; name: string; avatar: string; role: RoleType } | null
  project?: { id: string; name: string }
  planning?: { id: string; name: string; color: string | null } | null
}

// Notification types
export enum NotificationType {
  ProgressUpdate = 'progress_update',
  BehindProgress = 'behind_progress',
  Comment = 'comment',
  Reference = 'reference',
  ApprovalSubmitted = 'approval_submitted',
  ApprovalApproved = 'approval_approved',
  ApprovalRejected = 'approval_rejected',
  ApprovalCancelled = 'approval_cancelled'
}

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
export enum WSMessageType {
  TaskCreate = 'task:create',
  TaskUpdate = 'task:update',
  TaskDelete = 'task:delete',
  ProjectCreate = 'project:create',
  ProjectUpdate = 'project:update',
  ProjectDelete = 'project:delete',
  MemberCreate = 'member:create',
  MemberUpdate = 'member:update',
  MemberDelete = 'member:delete',
  PlanningCreate = 'planning:create',
  PlanningUpdate = 'planning:update',
  PlanningDelete = 'planning:delete',
  UserLogin = 'user:login',
  UserLogout = 'user:logout',
  UserCreate = 'user:create',
  UserUpdate = 'user:update',
  UserDelete = 'user:delete',
  SyncInit = 'sync:init',
  SyncUpdate = 'sync:update',
  NotificationCreate = 'notification:create',
  NotificationUpdate = 'notification:update',
  NotificationReadAll = 'notification:read-all',
  ApprovalCreate = 'approval:create',
  ApprovalUpdate = 'approval:update'
}

export interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: string
}
