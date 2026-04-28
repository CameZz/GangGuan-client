// Mock data and operations for development without a server

import type { Project, Member, Task, TaskStatus, Planning, Participant, User } from '@/types'

// Generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// Initial mock data
const mockUsers: User[] = [
  // PM (项目管理)
  {
    id: 'user-1',
    employeeId: 'admin',
    password: 'admin123',
    name: '系统管理员',
    phone: '13800000000',
    email: 'admin@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'pm',
    isAdmin: true
  },
  {
    id: 'user-2',
    employeeId: 'EMP001',
    password: '123456',
    name: 'Alice Johnson',
    phone: '13800000001',
    email: 'alice@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    role: 'pm',
    isAdmin: false
  },
  {
    id: 'user-6',
    employeeId: 'EMP010',
    password: '123456',
    name: 'Michael Chen',
    phone: '13800000010',
    email: 'michael@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    role: 'pm',
    isAdmin: false
  },
  // 策划 (Planner)
  {
    id: 'user-4',
    employeeId: 'EMP003',
    password: '123456',
    name: 'Carol Williams',
    phone: '13800000003',
    email: 'carol@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    role: 'planner',
    isAdmin: false
  },
  {
    id: 'user-7',
    employeeId: 'EMP011',
    password: '123456',
    name: 'Eric Zhang',
    phone: '13800000011',
    email: 'eric@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eric',
    role: 'planner',
    isAdmin: false
  },
  // 美术 (Artist)
  {
    id: 'user-8',
    employeeId: 'EMP012',
    password: '123456',
    name: 'Lisa Wang',
    phone: '13800000012',
    email: 'lisa@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    role: 'artist',
    isAdmin: false
  },
  {
    id: 'user-9',
    employeeId: 'EMP013',
    password: '123456',
    name: 'Tom Liu',
    phone: '13800000013',
    email: 'tom@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom',
    role: 'artist',
    isAdmin: false
  },
  // UI
  {
    id: 'user-10',
    employeeId: 'EMP014',
    password: '123456',
    name: 'Amy Chen',
    phone: '13800000014',
    email: 'amy@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
    role: 'ui',
    isAdmin: false
  },
  {
    id: 'user-11',
    employeeId: 'EMP015',
    password: '123456',
    name: 'Kevin Li',
    phone: '13800000015',
    email: 'kevin@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin',
    role: 'ui',
    isAdmin: false
  },
  // 程序(服务端) (Server)
  {
    id: 'user-3',
    employeeId: 'EMP002',
    password: '123456',
    name: 'Bob Smith',
    phone: '13800000002',
    email: 'bob@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    role: 'server',
    isAdmin: false
  },
  {
    id: 'user-12',
    employeeId: 'EMP016',
    password: '123456',
    name: 'Jason Wang',
    phone: '13800000016',
    email: 'jason@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jason',
    role: 'server',
    isAdmin: false
  },
  // 程序(客户端) (Client)
  {
    id: 'user-5',
    employeeId: 'EMP004',
    password: '123456',
    name: 'David Brown',
    phone: '13800000004',
    email: 'david@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    role: 'client',
    isAdmin: false
  },
  {
    id: 'user-13',
    employeeId: 'EMP017',
    password: '123456',
    name: 'Chris Zhou',
    phone: '13800000017',
    email: 'chris@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris',
    role: 'client',
    isAdmin: false
  },
  // 运维 (DevOps)
  {
    id: 'user-14',
    employeeId: 'EMP018',
    password: '123456',
    name: 'Alex Yang',
    phone: '13800000018',
    email: 'alex@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    role: 'devops',
    isAdmin: false
  },
  {
    id: 'user-15',
    employeeId: 'EMP019',
    password: '123456',
    name: 'Ryan Huang',
    phone: '13800000019',
    email: 'ryan@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan',
    role: 'devops',
    isAdmin: false
  },
  // 动作/特效 (Animator)
  {
    id: 'user-16',
    employeeId: 'EMP020',
    password: '123456',
    name: 'Mia Sun',
    phone: '13800000020',
    email: 'mia@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
    role: 'animator',
    isAdmin: false
  },
  {
    id: 'user-17',
    employeeId: 'EMP021',
    password: '123456',
    name: 'Daniel Wu',
    phone: '13800000021',
    email: 'daniel@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel',
    role: 'animator',
    isAdmin: false
  },
  // 音效 (Sound)
  {
    id: 'user-18',
    employeeId: 'EMP022',
    password: '123456',
    name: 'Emily Lin',
    phone: '13800000022',
    email: 'emily@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    role: 'sound',
    isAdmin: false
  },
  {
    id: 'user-19',
    employeeId: 'EMP023',
    password: '123456',
    name: 'Frank Ma',
    phone: '13800000023',
    email: 'frank@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Frank',
    role: 'sound',
    isAdmin: false
  },
  // 测试 (Tester)
  {
    id: 'user-20',
    employeeId: 'EMP024',
    password: '123456',
    name: 'Grace Xu',
    phone: '13800000024',
    email: 'grace@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grace',
    role: 'tester',
    isAdmin: false
  },
  {
    id: 'user-21',
    employeeId: 'EMP025',
    password: '123456',
    name: 'Henry Zhao',
    phone: '13800000025',
    email: 'henry@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Henry',
    role: 'tester',
    isAdmin: false
  }
]

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
    email: 'alice@example.com',
    role: 'pm'
  },
  {
    id: 'mem-2',
    name: 'Bob Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    email: 'bob@example.com',
    role: 'server'
  },
  {
    id: 'mem-3',
    name: 'Carol Williams',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    email: 'carol@example.com',
    role: 'planner'
  },
  {
    id: 'mem-4',
    name: 'David Brown',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    email: 'david@example.com',
    role: 'client'
  }
]

const mockPlannings: Planning[] = [
  {
    id: 'plan-1',
    name: 'Homepage Design',
    deadline: '2024-03-01T00:00:00Z',
    projectId: 'proj-1',
    createdAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'plan-2',
    name: 'Navigation Component',
    deadline: '2024-03-15T00:00:00Z',
    projectId: 'proj-1',
    createdAt: '2024-02-01T09:00:00Z'
  },
  {
    id: 'plan-3',
    name: 'Mobile Setup',
    deadline: '2024-02-15T00:00:00Z',
    projectId: 'proj-2',
    createdAt: '2024-02-01T08:00:00Z'
  }
]

const createDefaultParticipants = (): Participant[] => [
  { roleType: 'pm', memberId: 'mem-1', startTime: null, endTime: null },
  { roleType: 'tester', memberId: '', startTime: null, endTime: null }
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
    updatedAt: '2024-02-28T15:00:00Z',
    stage: 'completed',
    planningId: 'plan-1',
    participants: [
      { roleType: 'pm', memberId: 'mem-1', startTime: '2024-01-20T10:00:00Z', endTime: '2024-02-01T00:00:00Z' },
      { roleType: 'planner', memberId: 'mem-3', startTime: '2024-01-22T00:00:00Z', endTime: '2024-01-28T00:00:00Z' },
      { roleType: 'artist', memberId: '', startTime: '2024-01-28T00:00:00Z', endTime: '2024-02-05T00:00:00Z' },
      { roleType: 'tester', memberId: '', startTime: '2024-02-20T00:00:00Z', endTime: '2024-02-28T00:00:00Z' }
    ],
    references: [
      { type: 'design', url: 'https://figma.com/mockup1', title: 'Homepage Design Spec' }
    ],
    comments: [
      { id: 'com-1', authorId: 'mem-1', content: 'Initial design approved by client', createdAt: '2024-02-28T14:00:00Z' }
    ]
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
    updatedAt: '2024-03-01T12:00:00Z',
    stage: 'initial',
    planningId: 'plan-2',
    participants: [
      { roleType: 'pm', memberId: 'mem-1', startTime: '2024-02-01T09:00:00Z', endTime: null },
      { roleType: 'planner', memberId: 'mem-3', startTime: '2024-02-01T09:00:00Z', endTime: '2024-02-10T00:00:00Z' },
      { roleType: 'ui', memberId: '', startTime: '2024-02-10T00:00:00Z', endTime: '2024-02-15T00:00:00Z' },
      { roleType: 'server', memberId: 'mem-2', startTime: '2024-02-15T00:00:00Z', endTime: null },
      { roleType: 'client', memberId: 'mem-4', startTime: '2024-02-20T00:00:00Z', endTime: null }
    ],
    references: [
      { type: 'ui', url: 'https://figma.com/nav-spec', title: 'Navigation UI Spec' }
    ],
    comments: []
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
    updatedAt: '2024-02-05T11:00:00Z',
    stage: 'filed',
    planningId: null,
    participants: createDefaultParticipants(),
    references: [],
    comments: []
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
    updatedAt: '2024-02-14T17:00:00Z',
    stage: 'completed',
    planningId: 'plan-3',
    participants: [
      { roleType: 'pm', memberId: 'mem-1', startTime: '2024-02-01T08:00:00Z', endTime: '2024-02-14T17:00:00Z' },
      { roleType: 'server', memberId: 'mem-2', startTime: '2024-02-01T08:00:00Z', endTime: '2024-02-14T17:00:00Z' },
      { roleType: 'tester', memberId: '', startTime: '2024-02-10T00:00:00Z', endTime: '2024-02-14T17:00:00Z' }
    ],
    references: [],
    comments: []
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
    updatedAt: '2024-03-01T10:00:00Z',
    stage: 'designing',
    planningId: null,
    participants: [
      { roleType: 'pm', memberId: 'mem-1', startTime: '2024-02-10T14:00:00Z', endTime: null },
      { roleType: 'planner', memberId: 'mem-3', startTime: '2024-02-10T14:00:00Z', endTime: '2024-02-15T00:00:00Z' },
      { roleType: 'artist', memberId: '', startTime: '2024-02-15T00:00:00Z', endTime: null },
      { roleType: 'tester', memberId: '', startTime: null, endTime: null }
    ],
    references: [],
    comments: []
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
    updatedAt: '2024-02-15T09:00:00Z',
    stage: 'filed',
    planningId: null,
    participants: createDefaultParticipants(),
    references: [],
    comments: []
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
    updatedAt: '2024-02-19T16:00:00Z',
    stage: 'completed',
    planningId: null,
    participants: createDefaultParticipants(),
    references: [],
    comments: []
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
    updatedAt: '2024-03-05T14:00:00Z',
    stage: 'preliminary',
    planningId: null,
    participants: [
      { roleType: 'pm', memberId: 'mem-1', startTime: '2024-02-20T08:00:00Z', endTime: null },
      { roleType: 'planner', memberId: 'mem-3', startTime: '2024-02-20T08:00:00Z', endTime: '2024-02-25T00:00:00Z' },
      { roleType: 'server', memberId: 'mem-2', startTime: '2024-02-25T00:00:00Z', endTime: null },
      { roleType: 'tester', memberId: '', startTime: null, endTime: null }
    ],
    references: [],
    comments: []
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
    updatedAt: '2024-02-25T11:00:00Z',
    stage: 'filed',
    planningId: null,
    participants: createDefaultParticipants(),
    references: [],
    comments: []
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
    updatedAt: '2024-03-01T09:00:00Z',
    stage: 'filed',
    planningId: null,
    participants: createDefaultParticipants(),
    references: [],
    comments: []
  }
]

// Storage for mock data (simulates server-side persistence)
let projects: Project[] = [...mockProjects]
let members: Member[] = [...mockMembers]
let plannings: Planning[] = [...mockPlannings]
let tasks: Task[] = [...mockTasks]
let users: User[] = [...mockUsers]

// Event handlers
type MockEventHandler = (data: any) => void
const eventHandlers: Map<string, Set<MockEventHandler>> = new Map()

// Helper to trigger events
const trigger = (type: string, payload: any): void => {
  eventHandlers.get(type)?.forEach(handler => handler(payload))
}

// Mock API functions
export const mockApi = {
  // Users
  getUsers: (): User[] => [...users],

  getUserByEmployeeId: (employeeId: string): User | undefined => {
    return users.find(u => u.employeeId === employeeId)
  },

  getUserById: (id: string): User | undefined => {
    return users.find(u => u.id === id)
  },

  createUser: (data: Omit<User, 'id'>): User => {
    const user: User = {
      ...data,
      id: generateId()
    }
    users.push(user)
    trigger('user:create', user)
    return user
  },

  updateUser: (id: string, data: Partial<User>): User | null => {
    const index = users.findIndex(u => u.id === id)
    if (index === -1) return null
    users[index] = { ...users[index], ...data }
    trigger('user:update', users[index])
    return users[index]
  },

  deleteUser: (id: string): boolean => {
    const index = users.findIndex(u => u.id === id)
    if (index === -1) return false
    users.splice(index, 1)
    trigger('user:delete', { id })
    return true
  },

  // Projects
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
    tasks = tasks.filter(t => t.projectId !== id)
    plannings = plannings.filter(p => p.projectId !== id)
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
    tasks = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: null } : t)
    trigger('member:delete', { id })
    return true
  },

  // Plannings
  getPlannings: (): Planning[] => [...plannings],

  getPlanningsByProject: (projectId: string): Planning[] => plannings.filter(p => p.projectId === projectId),

  createPlanning: (data: Omit<Planning, 'id' | 'createdAt'>): Planning => {
    const planning: Planning = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString()
    }
    plannings.push(planning)
    trigger('planning:create', planning)
    return planning
  },

  updatePlanning: (id: string, data: Partial<Planning>): Planning | null => {
    const index = plannings.findIndex(p => p.id === id)
    if (index === -1) return null
    plannings[index] = { ...plannings[index], ...data }
    trigger('planning:update', plannings[index])
    return plannings[index]
  },

  deletePlanning: (id: string): boolean => {
    const index = plannings.findIndex(p => p.id === id)
    if (index === -1) return false
    plannings.splice(index, 1)
    tasks = tasks.map(t => t.planningId === id ? { ...t, planningId: null } : t)
    trigger('planning:delete', { id })
    return true
  },

  // Tasks
  getTasks: (): Task[] => [...tasks],

  getTasksByProject: (projectId: string): Task[] => tasks.filter(t => t.projectId === projectId),

  getTasksByStatus: (status: TaskStatus): Task[] => tasks.filter(t => t.status === status),

  getTasksByPlanning: (planningId: string): Task[] => tasks.filter(t => t.planningId === planningId),

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
    plannings: [...plannings],
    tasks: [...tasks],
    users: [...users]
  }),

  // Reset to initial state
  reset: (): void => {
    projects = [...mockProjects]
    members = [...mockMembers]
    plannings = [...mockPlannings]
    tasks = [...mockTasks]
    users = [...mockUsers]
  }
}

export default mockApi