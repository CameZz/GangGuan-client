// Mock data and operations for development without a server

import type { Project, Member, Task, TaskStatus } from '@/types'

// Generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// Initial mock data
const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Complete redesign of the company website with modern UI/UX',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'proj-2',
    name: 'Mobile App Development',
    description: 'Build a cross-platform mobile application for customers',
    createdAt: '2024-02-01T09:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'API Integration',
    description: 'Integrate third-party APIs for payment and analytics',
    createdAt: '2024-02-10T14:30:00Z'
  }
]

const mockMembers: Member[] = [
  {
    id: 'mem-1',
    name: 'Alice Johnson',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    email: 'alice@example.com'
  },
  {
    id: 'mem-2',
    name: 'Bob Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    email: 'bob@example.com'
  },
  {
    id: 'mem-3',
    name: 'Carol Williams',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    email: 'carol@example.com'
  },
  {
    id: 'mem-4',
    name: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    email: 'david@example.com'
  }
]

const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Design homepage mockup',
    description: 'Create wireframes and high-fidelity mockups for the new homepage',
    status: 'done',
    priority: 'high',
    dueDate: '2024-03-01T00:00:00Z',
    projectId: 'proj-1',
    assigneeId: 'mem-1',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-28T15:00:00Z'
  },
  {
    id: 'task-2',
    title: 'Implement responsive navigation',
    description: 'Build a mobile-friendly navigation component',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-03-15T00:00:00Z',
    projectId: 'proj-1',
    assigneeId: 'mem-2',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-01T12:00:00Z'
  },
  {
    id: 'task-3',
    title: 'Write content for about page',
    description: 'Create compelling copy for the company story and team section',
    status: 'todo',
    priority: 'medium',
    dueDate: '2024-03-20T00:00:00Z',
    projectId: 'proj-1',
    assigneeId: 'mem-3',
    createdAt: '2024-02-05T11:00:00Z',
    updatedAt: '2024-02-05T11:00:00Z'
  },
  {
    id: 'task-4',
    title: 'Set up React Native project',
    description: 'Initialize the mobile app project with required dependencies',
    status: 'done',
    priority: 'high',
    dueDate: '2024-02-15T00:00:00Z',
    projectId: 'proj-2',
    assigneeId: 'mem-2',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-14T17:00:00Z'
  },
  {
    id: 'task-5',
    title: 'Design app icon and splash screen',
    description: 'Create app icon and launch screen graphics',
    status: 'in-progress',
    priority: 'medium',
    dueDate: '2024-03-10T00:00:00Z',
    projectId: 'proj-2',
    assigneeId: 'mem-1',
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 'task-6',
    title: 'Implement user authentication',
    description: 'Build login/signup flow with JWT tokens',
    status: 'todo',
    priority: 'high',
    dueDate: '2024-03-25T00:00:00Z',
    projectId: 'proj-2',
    assigneeId: 'mem-4',
    createdAt: '2024-02-15T09:00:00Z',
    updatedAt: '2024-02-15T09:00:00Z'
  },
  {
    id: 'task-7',
    title: 'Research payment gateways',
    description: 'Compare Stripe, PayPal, and Square for our use case',
    status: 'done',
    priority: 'medium',
    dueDate: '2024-02-20T00:00:00Z',
    projectId: 'proj-3',
    assigneeId: 'mem-3',
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-19T16:00:00Z'
  },
  {
    id: 'task-8',
    title: 'Set up Stripe integration',
    description: 'Implement payment processing with Stripe API',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-03-30T00:00:00Z',
    projectId: 'proj-3',
    assigneeId: 'mem-2',
    createdAt: '2024-02-20T08:00:00Z',
    updatedAt: '2024-03-05T14:00:00Z'
  },
  {
    id: 'task-9',
    title: 'Configure analytics dashboard',
    description: 'Set up Google Analytics and custom event tracking',
    status: 'todo',
    priority: 'low',
    dueDate: '2024-04-05T00:00:00Z',
    projectId: 'proj-3',
    assigneeId: 'mem-1',
    createdAt: '2024-02-25T11:00:00Z',
    updatedAt: '2024-02-25T11:00:00Z'
  },
  {
    id: 'task-10',
    title: 'Performance optimization audit',
    description: 'Analyze and optimize app performance metrics',
    status: 'todo',
    priority: 'medium',
    dueDate: '2024-04-10T00:00:00Z',
    projectId: 'proj-2',
    assigneeId: null,
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-03-01T09:00:00Z'
  }
]

// Storage for mock data (simulates server-side persistence)
let projects: Project[] = [...mockProjects]
let members: Member[] = [...mockMembers]
let tasks: Task[] = [...mockTasks]

// Event handlers
type MockEventHandler = (data: any) => void
const eventHandlers: Map<string, Set<MockEventHandler>> = new Map()

// Helper to trigger events
const trigger = (type: string, payload: any): void => {
  eventHandlers.get(type)?.forEach(handler => handler(payload))
}

// Mock API functions
export const mockApi = {
  // Projects
  getProjects: (): Project[] => [...projects],

  createProject: (data: Omit<Project, 'id' | 'createdAt'>): Project => {
    const project: Project = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    projects.push(project)
    trigger('project:create', project)
    return project
  },

  updateProject: (id: string, data: Partial<Project>): Project | null => {
    const index = projects.findIndex(p => p.id === id)
    if (index === -1) return null
    projects[index] = { ...projects[index], ...data }
    trigger('project:update', projects[index])
    return projects[index]
  },

  deleteProject: (id: string): boolean => {
    const index = projects.findIndex(p => p.id === id)
    if (index === -1) return false
    projects.splice(index, 1)
    // Also delete related tasks
    tasks = tasks.filter(t => t.projectId !== id)
    trigger('project:delete', { id })
    return true
  },

  // Members
  getMembers: (): Member[] => [...members],

  createMember: (data: Omit<Member, 'id'>): Member => {
    const member: Member = {
      ...data,
      id: generateId()
    }
    members.push(member)
    trigger('member:create', member)
    return member
  },

  updateMember: (id: string, data: Partial<Member>): Member | null => {
    const index = members.findIndex(m => m.id === id)
    if (index === -1) return null
    members[index] = { ...members[index], ...data }
    trigger('member:update', members[index])
    return members[index]
  },

  deleteMember: (id: string): boolean => {
    const index = members.findIndex(m => m.id === id)
    if (index === -1) return false
    members.splice(index, 1)
    // Remove member from task assignments
    tasks = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: null } : t)
    trigger('member:delete', { id })
    return true
  },

  // Tasks
  getTasks: (): Task[] => [...tasks],

  getTasksByProject: (projectId: string): Task[] => tasks.filter(t => t.projectId === projectId),

  getTasksByStatus: (status: TaskStatus): Task[] => tasks.filter(t => t.status === status),

  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
    const task: Task = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.push(task)
    trigger('task:create', task)
    return task
  },

  updateTask: (id: string, data: Partial<Task>): Task | null => {
    const index = tasks.findIndex(t => t.id === id)
    if (index === -1) return null
    tasks[index] = { ...tasks[index], ...data, updatedAt: new Date().toISOString() }
    trigger('task:update', tasks[index])
    return tasks[index]
  },

  deleteTask: (id: string): boolean => {
    const index = tasks.findIndex(t => t.id === id)
    if (index === -1) return false
    tasks.splice(index, 1)
    trigger('task:delete', { id })
    return true
  },

  // Events
  on: (type: string, handler: MockEventHandler): void => {
    if (!eventHandlers.has(type)) {
      eventHandlers.set(type, new Set())
    }
    eventHandlers.get(type)!.add(handler)
  },

  off: (type: string, handler: MockEventHandler): void => {
    eventHandlers.get(type)?.delete(handler)
  },

  // Sync initial data
  getInitialData: () => ({
    projects: [...projects],
    members: [...members],
    tasks: [...tasks]
  }),

  // Reset to initial state
  reset: (): void => {
    projects = [...mockProjects]
    members = [...mockMembers]
    tasks = [...mockTasks]
  }
}

export default mockApi
