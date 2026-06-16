# 钢管系统客户端

这是一个基于 Vue 3 + Vite + TypeScript 的项目管理系统前端，用于游戏研发项目中的任务协作、排期管理、成员管理和项目进度查看。当前项目使用本地 mock 数据模拟后端接口，适合作为前端原型、内部演示或后续接入真实后端的基础版本。

## 核心功能

- 登录与权限控制：支持普通用户和管理员账号，路由会根据登录状态、项目选择状态和管理员权限进行拦截。
- 项目管理：支持项目选择、项目详情查看、项目创建/编辑/删除，并记录当前选中的项目。
- 任务管理：支持任务创建、编辑、删除、状态流转、优先级、负责人、截止日期、任务阶段、参与人员、参考资料、评论和变更历史。
- 多视图协作：提供看板视图、列表视图、时间轴视图和成员排期视图，便于从不同角度查看项目推进情况。
- 成员与角色：成员数据来源于用户数据，内置 PM、策划、美术、UI、服务端、客户端、运维、动作/特效、音效、测试等角色类型。
- 规划管理：支持按项目维护 planning/任务集合，并在侧边栏中切换当前 planning。
- 管理后台：管理员可以进入管理页维护用户相关信息。
- Mock 实时同步：`mockApi` 提供事件监听机制，store 会监听数据变更事件；项目中也预留了 WebSocket service，可在后续切换到真实实时通信。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router

## 目录结构

```text
src/
  App.vue                    应用布局入口，控制 Header 和 Sidebar 的展示
  main.ts                    Vue 应用入口，注册 Pinia、Router 并初始化 stores
  router/index.ts            路由配置与导航守卫
  stores/                    Pinia 状态管理
    user.ts                  登录、用户资料、管理员操作
    project.ts               项目列表、当前项目、当前 planning 选择
    task.ts                  任务列表、筛选、更新、历史记录
    planning.ts              项目 planning 管理
    member.ts                从用户数据派生成员数据
  views/                     页面视图
    LoginView.vue            登录页
    ProjectSelectView.vue    项目选择页
    DashboardView.vue        仪表盘
    KanbanView.vue           看板
    ListView.vue             任务列表
    TimelineView.vue         时间轴
    MemberScheduleView.vue   成员排期
    MembersView.vue          成员页
    ProjectDetailView.vue    项目详情
    ProfileView.vue          个人资料
    AdminView.vue            管理后台
  components/                业务组件和布局组件
  types/index.ts             业务类型定义
  utils/mock.ts              本地 mock 数据与模拟接口
  utils/websocket.ts         WebSocket 服务封装
```

## 本地运行

安装依赖：

```bash
npm install
```

仅本机访问：

```bash
npm run dev
```

局域网访问：

```bash
npm run dev:host
```

局域网模式启动后，同一网络下的同事可以通过下面的地址访问：

```text
http://你的电脑局域网IP:3000
```

如果无法访问，请检查 Windows 防火墙是否允许 Node/Vite 监听对应端口。

## 构建与预览

生产构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 演示账号

管理员账号：

```text
账号：admin
密码：admin123
```

普通演示账号：

```text
账号：EMP001、EMP002、EMP003 等
密码：123456
```

## 路由说明

- `/login`：登录页
- `/projects`：项目选择页
- `/dashboard/:projectId`：项目仪表盘
- `/kanban/:projectId`：项目看板
- `/list/:projectId`：项目任务列表
- `/timeline/:projectId`：项目时间轴
- `/member-schedule/:projectId`：项目成员排期
- `/members/:projectId`：项目成员页
- `/project/:id`：项目详情
- `/profile`：个人资料
- `/admin`：管理后台，仅管理员可访问

部分页面也保留了不带 `projectId` 的路由版本，用于全局或兼容访问。

## 数据说明

当前项目尚未接入真实后端，业务数据主要来自 `src/utils/mock.ts`。应用启动时会通过 `storesManager.init()` 初始化项目、任务、用户、成员和 planning 数据。

用户登录状态会保存到 `localStorage.currentUser`，刷新页面后会自动恢复登录状态。

## 后续接入建议

- 将 `mockApi` 替换为真实 HTTP API 或请求层封装。
- 根据后端鉴权方案调整 `userStore.login`、路由守卫和 token 存储方式。
- 将 `wsService` 从 mock mode 切换到真实 WebSocket 地址，用于任务、项目、成员、planning 的实时同步。
- 修复或统一源码文件中的中文编码，避免角色名、阶段名、历史记录字段在部分环境中出现乱码。
