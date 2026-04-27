// Type definitions for the project management system

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface Member {
  id: string
  name: string
  avatar: string
  email: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  projectId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

// WebSocket message types
export type WSMessageType =
  | 'task:create' | 'task:update' | 'task:delete'
  | 'project:create' | 'project:update' | 'project:delete'
  | 'member:create' | 'member:update' | 'member:delete'
  | 'sync:init' | 'sync:update'

export interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: string
}
