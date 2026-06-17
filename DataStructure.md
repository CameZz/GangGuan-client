# 项目数据结构说明

本文档总结当前前端项目的核心数据结构、状态存储、数据关系和 mock 数据流。项目是 Vue 3 + TypeScript + Pinia 应用，业务类型集中在 `src/types/index.ts`，运行时数据由 `src/utils/mock.ts` 中的本地 mock API 提供。

## 1. 数据总览

当前系统围绕“游戏研发项目管理”组织数据，主要实体包括：

| 实体 | TypeScript 类型 | 主要用途 | 主要存储位置 |
| --- | --- | --- | --- |
| 用户 | `User` | 登录、权限、成员来源、操作人 | `userStore` / `mockApi.users` |
| 成员 | `Member` | 任务/阶段负责人展示 | 从 `User[]` 派生 |
| 角色 | `Role` / `RoleType` | 权限和职责分类 | 静态常量 `ROLES` |
| 项目 | `Project` | 项目维度的数据容器 | `projectStore` / `mockApi.projects` |
| 项目阶段模板 | `ProjectPhaseTemplate` | 项目级任务阶段库 | `Project.phaseTemplates` |
| Planning / 迭代 | `Planning` | 项目下的任务集合或迭代 | `planningStore` / `mockApi.plannings` |
| 需求/任务 | `Task` | 工作项，支持需求单和拆分任务 | `taskStore` / `mockApi.tasks` |
| 任务阶段 | `TaskPhase` | 任务执行阶段、负责人、进度和排期 | `Task.phases` |
| 参考资料 | `Reference` | 任务相关设计稿、文档、链接 | `Task.references` |
| 评论 | `Comment` | 任务讨论内容 | `Task.comments` |
| 修改历史 | `TaskHistory` | 任务字段变更记录 | `mockApi.taskHistories` |
| 进度历史 | `TaskProgressHistory` | 任务阶段进度变更记录 | `mockApi.taskProgressHistories` |
| WebSocket 消息 | `WSMessage` | 后续真实实时同步预留结构 | `wsService` |

应用启动时，`src/main.ts` 调用 `storesManager.init()`，由各 Pinia store 从 `mockApi` 拉取初始数据。

## 2. 核心枚举和字典

### 2.1 任务状态

`TaskStatus` 描述工作项整体流转状态：

```ts
type TaskStatus = 'todo' | 'in-progress' | 'done' | 'abandoned'
```

- `todo`：待办
- `in-progress`：进行中
- `done`：已完成
- `abandoned`：已废弃

### 2.2 任务优先级

```ts
type TaskPriority = 'low' | 'medium' | 'high'
```

### 2.3 工作项类型

```ts
type TaskItemType = 'requirement' | 'task'
```

- `requirement`：需求单，作为父级工作项。
- `task`：实际拆分任务，可挂在某个需求单下，也可以独立存在。

### 2.4 任务阶段状态

```ts
type TaskPhaseStatus = 'pending' | 'in-progress' | 'done'
```

阶段状态由进度自动推导：

- `progress <= 0` -> `pending`
- `0 < progress < 100` -> `in-progress`
- `progress >= 100` -> `done`

### 2.5 角色类型

```ts
type RoleType =
  | 'pm'
  | 'planner'
  | 'artist'
  | 'ui'
  | 'server'
  | 'client'
  | 'devops'
  | 'animator'
  | 'sound'
  | 'tester'
```

`ROLES` 为静态角色表，每个角色包含：

```ts
interface Role {
  type: RoleType
  name: string
  canManageAll: boolean
}
```

其中 `pm` 的 `canManageAll` 为 `true`。另外，`User.isAdmin` 也会赋予更高管理权限。

### 2.6 旧版任务阶段值

`TaskStage` 是兼容旧流程的阶段字段：

```ts
type TaskStage =
  | 'filed'
  | 'designing'
  | 'initial'
  | 'preliminary'
  | 'final'
  | 'finalAcceptance'
  | 'completed'
```

当前主要执行进度来自 `Task.phases`，`Task.stage` 会根据当前阶段模板辅助推导和展示。

## 3. 领域模型

### 3.1 Project

项目是任务、迭代、阶段模板和工作日配置的上层容器。

```ts
interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  phaseTemplates: ProjectPhaseTemplate[]
  nonWorkdays: string[]
  extraWorkdays: string[]
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 项目 ID |
| `name` | `string` | 项目名称 |
| `description` | `string` | 项目描述 |
| `createdAt` | `string` | ISO 时间字符串 |
| `phaseTemplates` | `ProjectPhaseTemplate[]` | 该项目可用的任务阶段模板 |
| `nonWorkdays` | `string[]` | 原本应上班但休息的日期，如节假日 |
| `extraWorkdays` | `string[]` | 原本休息但上班的日期，如补班 |

`nonWorkdays` 和 `extraWorkdays` 会被时间轴、成员排期等视图用于工作日计算。

### 3.2 ProjectPhaseTemplate

项目阶段模板定义一个项目内任务可以采用哪些阶段。

```ts
interface ProjectPhaseTemplate {
  id: string
  name: string
  order: number
  enabled: boolean
}
```

业务规则：

- 新项目若未提供模板，会通过 `createDefaultPhaseTemplates()` 从 `TASK_STAGES` 生成默认模板。
- `normalizePhaseTemplates()` 会补齐缺失字段、按 `order` 排序，并重排为连续序号。
- 项目详情页可新增、修改、上下移动阶段模板。
- 只有 `enabled === true` 的模板会用于新建任务阶段。

### 3.3 User

用户同时承担登录账号、权限主体和成员数据源的职责。

```ts
interface User {
  id: string
  employeeId: string
  password: string
  name: string
  phone: string
  email: string
  avatar: string
  role: RoleType
  isAdmin: boolean
}
```

权限规则：

- `isAdmin === true`：管理员，可访问 `/admin`，可创建和删除用户。
- `role === 'pm'` 或管理员：项目管理者，可访问项目详情管理页。
- 当前登录用户保存在 `localStorage.currentUser`，页面刷新后由 `userStore.init()` 恢复。

### 3.4 Member

成员是从用户派生出的轻量展示模型，不独立持久化。

```ts
interface Member {
  id: string
  name: string
  avatar: string
  email: string
  role: RoleType
}
```

`memberStore.members` 通过 `userStore.getAllUsers()` 映射得到，因此：

- 用户增删改会影响成员列表。
- 任务负责人、阶段负责人使用的 ID 实际上是 `User.id`。

### 3.5 Planning

Planning 表示项目下的任务集合、迭代或阶段性计划。

```ts
interface Planning {
  id: string
  name: string
  deadline: string | null
  projectId: string
  createdAt: string
}
```

字段关系：

- `projectId` 指向所属 `Project.id`。
- `Task.planningId` 指向所属 `Planning.id`。
- `projectStore.selectedPlanningId` 记录当前侧边栏选中的 planning，并会同步到路由 query：`?planning=<id>`。

### 3.6 Task

`Task` 是系统中最核心的工作项结构，同时承载需求单和拆分任务。

```ts
interface Task {
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
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 工作项 ID |
| `itemType` | `'requirement' \| 'task'` | 区分需求单和任务 |
| `parentRequirementId` | `string \| null` | 子任务所属需求单 ID |
| `title` | `string` | 标题 |
| `description` | `string` | 描述 |
| `status` | `TaskStatus` | 整体状态 |
| `priority` | `TaskPriority` | 优先级 |
| `dueDate` | `string \| null` | 截止日期 |
| `projectId` | `string` | 所属项目 ID |
| `assigneeId` | `string \| null` | 当前负责人，通常来自当前阶段负责人 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |
| `stage` | `TaskStage` | 兼容旧阶段字段 |
| `phases` | `TaskPhase[]` | 任务阶段列表 |
| `currentPhaseId` | `string \| null` | 当前未完成阶段 ID |
| `planningId` | `string \| null` | 所属 planning ID |
| `references` | `Reference[]` | 参考资料 |
| `comments` | `Comment[]` | 评论 |

需求单规则：

- `itemType === 'requirement'` 时，`parentRequirementId` 固定为 `null`。
- 需求单没有负责人、截止日期、阶段和当前阶段：`assigneeId = null`、`dueDate = null`、`phases = []`、`currentPhaseId = null`。
- 需求单不能在存在子任务时删除。
- 需求单进度通过其子任务完成数计算：`done / total`。

任务规则：

- `itemType === 'task'` 时，可以有 `parentRequirementId`，也可以是独立任务。
- 子任务的父级必须是同项目下的需求单，否则保存时会清空 `parentRequirementId`。
- 如果任务没有阶段，且所属项目存在启用模板，会自动从项目模板生成 `TaskPhase[]`。
- `status`、`stage`、`assigneeId`、`currentPhaseId` 会根据 `phases` 推导和规范化。

### 3.7 TaskPhase

任务阶段记录具体执行流程、排期、负责人和进度。

```ts
interface TaskPhase {
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
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 阶段实例 ID |
| `templateId` | `string` | 来源项目阶段模板 ID |
| `name` | `string` | 阶段名称 |
| `order` | `number` | 阶段顺序 |
| `assigneeId` | `string \| null` | 阶段负责人，指向 `User.id` |
| `progress` | `number` | 0-100 的阶段进度 |
| `status` | `TaskPhaseStatus` | 由进度推导出的阶段状态 |
| `startTime` | `string \| null` | 阶段开始时间 |
| `endTime` | `string \| null` | 阶段结束时间 |

阶段工具函数位于 `src/utils/taskPhases.ts`：

- `createDefaultPhaseTemplates()`：从默认阶段字典生成项目模板。
- `normalizePhaseTemplates()`：规范化项目阶段模板。
- `clampProgress()`：将进度限制在 `0-100`。
- `getPhaseStatus()`：根据进度推导阶段状态。
- `normalizeTaskPhases()`：规范化并排序任务阶段。
- `createTaskPhaseFromTemplate()`：从项目阶段模板生成任务阶段实例。
- `getCurrentTaskPhase()`：返回第一个未完成阶段。
- `getTaskPhaseProgress()`：计算阶段完成数、总数、平均百分比。
- `deriveStageFromPhase()`：从当前阶段推导旧版 `stage`。
- `deriveStatusFromPhases()`：从阶段进度推导任务整体状态。

### 3.8 Reference 和 Comment

```ts
interface Reference {
  type: 'design' | 'ui' | 'document' | 'link'
  url: string
  title: string
}

interface Comment {
  id: string
  authorId: string
  content: string
  createdAt: string
}
```

关系说明：

- `Reference` 嵌套在 `Task.references` 中，不是独立 store。
- `Comment.authorId` 指向 `User.id`。
- `Comment` 嵌套在 `Task.comments` 中，不是独立 store。

### 3.9 TaskHistory

任务字段变更历史。

```ts
interface TaskHistory {
  id: string
  taskId: string
  operatorId: string
  field: string
  oldValue: string
  newValue: string
  createdAt: string
}
```

记录规则：

- 由 `taskStore.updateTask()` 在更新时写入。
- 只有传入 `operatorId` 时才会记录。
- 关注字段包括：`status`、`priority`、`stage`、`phases`、`assigneeId`、`dueDate`、`title`、`description`。
- 如果只是阶段进度变化，不会重复写入普通 `TaskHistory`，而是写入 `TaskProgressHistory`。

### 3.10 TaskProgressHistory

任务阶段进度变更历史。

```ts
interface TaskProgressHistory {
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
```

用途：

- 成员排期视图按项目读取进度历史。
- 可追踪某个阶段由谁从多少进度改到多少进度。

## 4. 实体关系

核心关系可以概括为：

```text
User
  └─派生为 Member

Project
  ├─ phaseTemplates: ProjectPhaseTemplate[]
  ├─ nonWorkdays / extraWorkdays
  ├─ Planning[]             通过 Planning.projectId 关联
  └─ Task[]                 通过 Task.projectId 关联

Planning
  └─ Task[]                 通过 Task.planningId 关联

Task(requirement)
  └─ Task(task)[]           通过 Task.parentRequirementId 关联

Task(task)
  ├─ phases: TaskPhase[]
  ├─ references: Reference[]
  ├─ comments: Comment[]
  ├─ assigneeId -> User.id
  └─ phase.assigneeId -> User.id

TaskHistory
  ├─ taskId -> Task.id
  └─ operatorId -> User.id

TaskProgressHistory
  ├─ taskId -> Task.id
  ├─ phaseId -> TaskPhase.id
  ├─ assigneeId -> User.id | null
  └─ operatorId -> User.id
```

## 5. Pinia Store 结构

### 5.1 storesManager

`src/stores/index.ts` 创建 Pinia，并统一导出所有 store。`StoresManager.init()` 按顺序初始化：

1. `projectStore.init()`
2. `memberStore.init()`
3. `taskStore.init()`
4. `planningStore.init()`
5. `userStore.init()`

其中 `memberStore.init()` 不读取数据，因为成员由用户计算得到。

### 5.2 projectStore

状态：

```ts
projects: Ref<Project[]>
currentProjectId: Ref<string | null>
selectedPlanningId: Ref<string | null>
isLoading: Ref<boolean>
```

计算属性：

- `currentProject`：根据 `currentProjectId` 查找当前项目。
- `projectCount`：项目数量。

主要方法：

- `init()`：从 `mockApi.getProjects()` 读取项目。
- `setCurrentProject(id)`：设置当前项目；项目变化时清空 `selectedPlanningId`。
- `setSelectedPlanning(id)` / `clearSelectedPlanning()`：维护当前 planning。
- `createProject(data)` / `updateProject(id, data)` / `deleteProject(id)`：项目增删改。
- `getEnabledPhaseTemplates(projectId)`：获取项目启用的阶段模板。
- `addPhaseTemplate()` / `updatePhaseTemplate()` / `movePhaseTemplate()`：维护项目阶段模板。

事件订阅：

- `project:create`
- `project:update`
- `project:delete`

### 5.3 taskStore

状态：

```ts
tasks: Ref<Task[]>
isLoading: Ref<boolean>
```

计算属性：

- `taskItems`：过滤 `itemType !== 'requirement'` 的实际任务。
- `requirementItems`：过滤 `itemType === 'requirement'` 的需求单。
- `taskCount`：实际任务数量。
- `todoTasks` / `inProgressTasks` / `doneTasks` / `abandonedTasks`：按状态过滤任务。

主要方法：

- `init()`：从 `mockApi.getTasks()` 读取任务。
- `createTask(data)`：创建任务并规范化任务数据。
- `updateTask(id, data, operatorId?)`：更新任务，必要时记录历史。
- `deleteTask(id)`：删除任务；有子任务的需求单不可删除。
- `moveTask(id, status, operatorId?)`：移动任务状态。
- `getRequirementsByProject(projectId)`：按项目查需求单。
- `getChildTasks(requirementId)`：查需求单下的拆分任务。
- `getRequirementProgress(requirementId)`：计算需求单完成进度。
- `buildTaskPhasesFromTemplates(projectId, templateIds?, existingPhases?)`：由项目模板生成任务阶段。
- `updateTaskPhaseProgress(taskId, phaseId, progress, operatorId?)`：更新阶段进度。
- `canEditTaskPhaseProgress(phase, userId?)`：管理员或阶段负责人可编辑进度。
- `isUserParticipating(task, userId)`：用户是否为任务负责人或阶段负责人。
- `getTaskHistories(taskId)`：读取任务字段历史。
- `getTaskProgressHistories(taskId)`：读取任务进度历史。
- `getProjectTaskProgressHistories(projectId)`：读取项目下所有任务进度历史。
- `getTasksByFilters(filters)`：按项目、状态、优先级、负责人过滤。

事件订阅：

- `task:create`
- `task:update`
- `task:delete`

### 5.4 planningStore

状态：

```ts
plannings: Ref<Planning[]>
isLoading: Ref<boolean>
```

计算属性：

- `planningCount`：planning 数量。

主要方法：

- `init()`：从 `mockApi.getPlannings()` 读取 planning。
- `getPlanningById(id)`：按 ID 查找。
- `getPlanningsByProject(projectId)`：按项目查找。
- `createPlanning(data)` / `updatePlanning(id, data)` / `deletePlanning(id)`：planning 增删改。

事件订阅：

- `planning:create`
- `planning:update`
- `planning:delete`

### 5.5 userStore

状态：

```ts
currentUser: Ref<User | null>
isLoading: Ref<boolean>
```

计算属性：

- `isLoggedIn`：是否已登录。
- `isAdmin`：当前用户是否管理员。
- `isProjectManager`：管理员或 PM。

主要方法：

- `init()`：从 `localStorage.currentUser` 恢复登录状态。
- `login(employeeId, password)`：用工号和密码登录。
- `logout()`：清空当前用户和 localStorage。
- `updateProfile(data)`：更新当前用户资料。
- `createUser(data)`：管理员创建用户。
- `deleteUser(id)`：管理员删除用户。
- `getAllUsers()`：从 mock API 获取全部用户。

### 5.6 memberStore

状态全部来自计算属性：

```ts
members: ComputedRef<Member[]>
memberCount: ComputedRef<number>
```

主要方法：

- `getMemberById(id)`：按 ID 查找成员。
- `init()`：空实现。

## 6. Mock API 数据结构

`src/utils/mock.ts` 中包含初始种子数据和运行时数组。

### 6.1 初始种子数据

```ts
mockUsers: User[]
mockProjects: ProjectSeed[]
mockPlannings: Planning[]
mockTasks: TaskSeed[]
mockTaskProgressHistories: TaskProgressHistory[]
```

运行时复制为：

```ts
projects = mockProjects.map(normalizeProject)
plannings = [...mockPlannings]
tasks = mockTasks.map(normalizeTask)
users = [...mockUsers]
taskHistories = []
taskProgressHistories = [...mockTaskProgressHistories]
```

`ProjectSeed` 允许 `phaseTemplates` 缺省；`TaskSeed` 允许部分任务字段缺省，然后由 `normalizeProject()` 和 `normalizeTask()` 补齐。

### 6.2 Mock API 方法

用户：

- `getUsers()`
- `getUserByEmployeeId(employeeId)`
- `getUserById(id)`
- `createUser(data)`
- `updateUser(id, data)`
- `deleteUser(id)`

项目：

- `getProjects()`
- `createProject(data)`
- `updateProject(id, data)`
- `deleteProject(id)`

Planning：

- `getPlannings()`
- `getPlanningsByProject(projectId)`
- `createPlanning(data)`
- `updatePlanning(id, data)`
- `deletePlanning(id)`

任务：

- `getTasks()`
- `getTasksByProject(projectId)`
- `getTasksByStatus(status)`
- `getTasksByPlanning(planningId)`
- `createTask(data)`
- `updateTask(id, data)`
- `deleteTask(id)`

历史：

- `getTaskHistories(taskId)`
- `addTaskHistory(entry)`
- `getTaskProgressHistories(taskId)`
- `addTaskProgressHistory(entry)`

事件：

- `on(type, handler)`

### 6.3 Mock 事件机制

mock API 内部用以下结构维护事件订阅：

```ts
type MockEventHandler = (data: any) => void
const eventHandlers: Map<string, Set<MockEventHandler>> = new Map()
```

每次 create/update/delete 后会调用 `trigger(type, payload)`。各 store 监听对应事件，以便本地状态和 mock API 运行时数组保持同步。

常用事件包括：

- `user:create`
- `user:update`
- `user:delete`
- `project:create`
- `project:update`
- `project:delete`
- `planning:create`
- `planning:update`
- `planning:delete`
- `task:create`
- `task:update`
- `task:delete`
- `task:history:add`
- `task:progress-history:add`

## 7. WebSocket 消息结构

项目预留了 WebSocket service，目前默认使用 mock mode，不真正连接后端。

```ts
type WSMessageType =
  | 'task:create' | 'task:update' | 'task:delete'
  | 'project:create' | 'project:update' | 'project:delete'
  | 'member:create' | 'member:update' | 'member:delete'
  | 'planning:create' | 'planning:update' | 'planning:delete'
  | 'user:login' | 'user:logout' | 'user:create' | 'user:update' | 'user:delete'
  | 'sync:init' | 'sync:update'

interface WSMessage {
  type: WSMessageType
  payload: any
  timestamp: string
}
```

`wsService` 支持：

- `connect(url)`
- `send(type, payload)`
- `on(type, callback)`
- `off(type, callback)`
- `disconnect()`
- `setMockMode(mock)`
- `connected`

## 8. 路由和数据使用关系

主要路由通过 `meta` 控制认证、项目选择和权限：

| 路由 | 视图 | 依赖数据 |
| --- | --- | --- |
| `/login` | `LoginView` | `userStore.login()` |
| `/projects` | `ProjectSelectView` | `projectStore.projects`、`userStore.currentUser` |
| `/` / `/dashboard/:projectId` | `DashboardView` | 项目、成员、任务统计 |
| `/kanban` / `/kanban/:projectId` | `KanbanView` | 当前项目、当前 planning、任务列表 |
| `/list` / `/list/:projectId` | `ListView` | 当前项目、当前 planning、需求/任务结构 |
| `/timeline` / `/timeline/:projectId` | `TimelineView` | 任务阶段排期、项目工作日配置 |
| `/member-schedule` / `/member-schedule/:projectId` | `MemberScheduleView` | 成员、任务阶段、进度历史、项目工作日配置 |
| `/members` / `/members/:projectId` | `MembersView` | 用户派生成员、任务参与情况 |
| `/project/:id` | `ProjectDetailView` | 项目详情、项目阶段模板、工作日配置 |
| `/profile` | `ProfileView` | 当前用户资料 |
| `/admin` | `AdminView` | 用户管理，仅管理员 |

导航守卫规则：

- 未登录访问受保护页面会跳转 `/login`。
- 需要管理员的页面会检查 `userStore.isAdmin`。
- 需要项目的页面会检查或设置 `projectStore.currentProjectId`。
- 项目详情页需要管理员或 PM，否则跳转到该项目看板或项目选择页。

## 9. 关键业务规则

### 9.1 当前项目和当前 planning

- `projectStore.currentProjectId` 是当前项目上下文。
- 路由参数 `:projectId` 或项目详情的 `:id` 会同步到 `currentProjectId`。
- 切换项目时会清空 `selectedPlanningId`。
- `projectStore.selectedPlanningId` 是当前 planning 上下文，视图通过 `?planning=<id>` 和侧边栏保持同步。

### 9.2 需求和任务层级

- 需求单是 `Task` 的一种，使用 `itemType: 'requirement'`。
- 拆分任务也是 `Task`，使用 `itemType: 'task'`。
- 任务通过 `parentRequirementId` 挂到需求单下。
- 需求单自身不承载阶段，进度来自子任务。

### 9.3 阶段模板到任务阶段

项目维护 `Project.phaseTemplates`，任务维护 `Task.phases`。

创建或编辑任务时：

1. 读取项目启用模板。
2. 如果任务没有阶段，从模板生成阶段实例。
3. 每个阶段记录负责人、开始时间、结束时间和进度。
4. 任务整体状态从阶段进度推导。

### 9.4 状态推导

`Task.status` 会根据阶段进度自动调整：

- 所有阶段进度为 100：`done`
- 任一阶段进度大于 0：`in-progress`
- 所有阶段进度为 0：`todo`
- 如果原状态是 `abandoned`，保持 `abandoned`

`Task.currentPhaseId` 指向第一个未完成阶段。`Task.assigneeId` 优先使用当前阶段负责人。

### 9.5 历史记录

普通字段变化进入 `TaskHistory`。阶段进度变化进入 `TaskProgressHistory`。

普通历史会将部分字段转换为展示值，例如：

- `assigneeId` 转成员姓名。
- `phases` 转阶段摘要。
- `status`、`priority`、`stage`、`dueDate` 转可读文本。

### 9.6 成员排期

成员排期主要依赖：

- `Task.phases[].assigneeId`
- `Task.phases[].startTime`
- `Task.phases[].endTime`
- `Task.planningId`
- `Project.nonWorkdays`
- `Project.extraWorkdays`
- `TaskProgressHistory`

因此，实际排期粒度在阶段，而不是任务整体。

## 10. 后续接入真实后端时的结构建议

当前前端已经有比较清晰的领域模型。接入真实后端时建议保持以下接口边界：

1. 保持 `src/types/index.ts` 作为前后端 DTO 对齐基础。
2. 将 `mockApi` 替换为 HTTP API 层，但保留现有 store 方法签名。
3. 将 `Task.references` 和 `Task.comments` 视业务规模决定是否拆成独立资源。
4. 将 `TaskHistory` 和 `TaskProgressHistory` 作为只读追加日志处理。
5. 为 `User.password` 改为后端认证字段，前端不再保存明文密码。
6. 将 `localStorage.currentUser` 替换为 token/session 方案。
7. 如果启用真实 WebSocket，可复用现有 `WSMessage` 的 `type + payload + timestamp` 结构。
