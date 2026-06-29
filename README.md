# 钢管系统客户端

基于 Vue 3 + Vite + TypeScript 的游戏研发项目管理系统前端原型。面向游戏研发团队，提供任务协作、排期管理、成员管理和项目进度跟踪等功能。当前使用本地 mock 数据模拟后端接口，可作为前端原型、内部演示或后续接入真实后端的基础版本。

## 核心功能

### 用户与权限

- 支持管理员和普通用户两种账号类型
- 内置 10 种角色：PM、策划、美术、UI、程序(服务端)、程序(客户端)、运维、动作/特效、音效、测试
- 路由守卫根据登录状态、项目选择状态和角色权限进行拦截
- PM 和管理员可访问项目详情页，管理员可进入管理后台

### 项目管理

- 支持项目创建、编辑、删除和选择
- 每个项目可配置自定义阶段模板（立案、设计、初版实现、初步验收、终版完成、最终验收）
- 支持设置非工作日（节假日调休）和额外工作日（加班）

### 任务管理

- 支持需求和任务两种条目类型，需求可拆分为子任务
- 任务状态流转：待办 → 进行中 → 已完成 / 已废弃
- 优先级：低、中、高
- 任务阶段流转：立案 → 设计 → 初版实现 → 初步验收 → 终版完成 → 最终验收
- 每个阶段可设置独立负责人、进度百分比、起止时间
- 支持参考资料（设计稿、UI 稿、文档、链接）
- 支持评论和变更历史记录
- 支持按状态、优先级、负责人、阶段等条件筛选

### 多视图协作

| 视图 | 说明 |
|------|------|
| 看板视图 | 按状态分列展示任务，支持拖拽状态流转 |
| 列表视图 | 表格形式展示任务，支持排序和筛选 |
| 时间轴视图 | 甘特图式展示任务时间线和阶段进度 |
| 成员排期视图 | 按成员维度展示任务分配和时间安排 |

### 规划管理（Planning）

- 按项目维护规划/任务集合
- 侧边栏可切换当前规划，筛选关联任务

### 管理后台

- 管理员可维护用户信息（新增、编辑、删除用户）

### 实时通信预留

- `mockApi` 提供事件监听机制，store 监听数据变更事件模拟实时同步
- 已封装 WebSocket service（`src/utils/websocket.ts`），可切换到真实实时通信

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.4.21 | 前端框架 |
| TypeScript | ^5.4.0 | 类型系统 |
| Vite | ^5.2.0 | 构建工具 |
| Pinia | ^2.1.7 | 状态管理 |
| Vue Router | ^4.3.0 | 路由管理 |

## 目录结构

```text
src/
  main.ts                      应用入口，注册 Pinia/Router 并初始化 stores
  App.vue                      根布局，控制 Header/Sidebar/RouterView 的展示
  style.css                    全局样式
  router/
    index.ts                   路由配置与导航守卫（17 条路由）
  stores/
    index.ts                   StoresManager 统一初始化
    user.ts                    登录、用户资料、管理员操作
    project.ts                 项目列表、当前项目、阶段模板
    task.ts                    任务 CRUD、筛选、状态流转、历史记录
    planning.ts                规划管理
    member.ts                  从用户数据派生成员列表
  views/
    LoginView.vue              登录页
    ProjectSelectView.vue      项目选择页
    DashboardView.vue          项目仪表盘
    KanbanView.vue             看板视图
    ListView.vue               任务列表视图
    TimelineView.vue           时间轴视图
    MemberScheduleView.vue     成员排期视图
    MembersView.vue            成员管理页
    ProjectDetailView.vue      项目详情（PM/管理员）
    ProfileView.vue            个人资料
    AdminView.vue              管理后台（管理员）
  components/
    layout/                    AppHeader、AppSidebar
    task/                      TaskCard、TaskFilter、TaskModal
    project/                   ProjectCard、ProjectModal
    member/                    MemberAvatar、MemberModal
    common/                    EmptyState
  types/
    index.ts                   TypeScript 类型定义与枚举
  utils/
    mock.ts                    本地 mock 数据与模拟 API
    taskPhases.ts              任务阶段模板工具函数
    taskScheduleExport.ts      排期导出工具
    websocket.ts               WebSocket 服务封装
```

## 本地运行

```bash
# 安装依赖
npm install

# 本机访问（http://localhost:3000）
npm run dev

# 局域网访问（同事可通过 http://你的IP:3000 访问）
npm run dev:host
```

> 局域网模式如无法访问，请检查 Windows 防火墙是否允许 Node/Vite 监听 3000 端口。

## 构建与预览

```bash
npm run build     # 生产构建
npm run preview   # 预览构建结果
```

## 演示账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| EMP001 | 123456 | 普通用户 |
| EMP002 | 123456 | 普通用户 |
| EMP003 | 123456 | 普通用户 |

## 路由说明

| 路径 | 页面 | 权限要求 |
|------|------|----------|
| `/login` | 登录页 | 无 |
| `/projects` | 项目选择 | 已登录 |
| `/dashboard/:projectId` | 仪表盘 | 已登录 + 已选项目 |
| `/kanban/:projectId` | 看板 | 已登录 + 已选项目 |
| `/list/:projectId` | 任务列表 | 已登录 + 已选项目 |
| `/timeline/:projectId` | 时间轴 | 已登录 + 已选项目 |
| `/member-schedule/:projectId` | 成员排期 | 已登录 + 已选项目 |
| `/members/:projectId` | 成员页 | 已登录 + 已选项目 |
| `/project/:id` | 项目详情 | PM 或管理员 |
| `/profile` | 个人资料 | 已登录 |
| `/admin` | 管理后台 | 管理员 |

部分页面保留了不带 `:projectId` 的路由版本，用于全局或兼容访问。

## 数据说明

- 业务数据来自 `src/utils/mock.ts`，应用启动时通过 `storesManager.init()` 初始化
- 用户登录状态保存到 `localStorage.currentUser`，刷新页面自动恢复
- 设计文档参见项目根目录 `设计.md`，包含角色权限、数据模型和阶段流程的详细定义
