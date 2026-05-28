// Mock data and operations for development without a server

import type {
    Project,
    Task,
    TaskStatus,
    TaskHistory,
    Planning,
    User,
} from "@/types";

// Generate unique IDs
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Initial mock data
const mockUsers: User[] = [
    // PM (项目管理)
    {
        id: "user-1",
        employeeId: "admin",
        password: "admin123",
        name: "系统管理员",
        phone: "13800000000",
        email: "admin@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        role: "pm",
        isAdmin: true,
    },
    {
        id: "user-2",
        employeeId: "EMP001",
        password: "123456",
        name: "Alice Johnson",
        phone: "13800000001",
        email: "alice@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
        role: "pm",
        isAdmin: false,
    },
    {
        id: "user-6",
        employeeId: "EMP010",
        password: "123456",
        name: "Michael Chen",
        phone: "13800000010",
        email: "michael@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
        role: "pm",
        isAdmin: false,
    },
    // 策划 (Planner)
    {
        id: "user-4",
        employeeId: "EMP003",
        password: "123456",
        name: "Carol Williams",
        phone: "13800000003",
        email: "carol@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
        role: "planner",
        isAdmin: false,
    },
    {
        id: "user-7",
        employeeId: "EMP011",
        password: "123456",
        name: "Eric Zhang",
        phone: "13800000011",
        email: "eric@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eric",
        role: "planner",
        isAdmin: false,
    },
    // 美术 (Artist)
    {
        id: "user-8",
        employeeId: "EMP012",
        password: "123456",
        name: "Lisa Wang",
        phone: "13800000012",
        email: "lisa@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
        role: "artist",
        isAdmin: false,
    },
    {
        id: "user-9",
        employeeId: "EMP013",
        password: "123456",
        name: "Tom Liu",
        phone: "13800000013",
        email: "tom@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
        role: "artist",
        isAdmin: false,
    },
    // UI
    {
        id: "user-10",
        employeeId: "EMP014",
        password: "123456",
        name: "Amy Chen",
        phone: "13800000014",
        email: "amy@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amy",
        role: "ui",
        isAdmin: false,
    },
    {
        id: "user-11",
        employeeId: "EMP015",
        password: "123456",
        name: "Kevin Li",
        phone: "13800000015",
        email: "kevin@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin",
        role: "ui",
        isAdmin: false,
    },
    // 程序(服务端) (Server)
    {
        id: "user-3",
        employeeId: "EMP002",
        password: "123456",
        name: "Bob Smith",
        phone: "13800000002",
        email: "bob@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
        role: "server",
        isAdmin: false,
    },
    {
        id: "user-12",
        employeeId: "EMP016",
        password: "123456",
        name: "Jason Wang",
        phone: "13800000016",
        email: "jason@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jason",
        role: "server",
        isAdmin: false,
    },
    // 程序(客户端) (Client)
    {
        id: "user-5",
        employeeId: "EMP004",
        password: "123456",
        name: "David Brown",
        phone: "13800000004",
        email: "david@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        role: "client",
        isAdmin: false,
    },
    {
        id: "user-13",
        employeeId: "EMP017",
        password: "123456",
        name: "Chris Zhou",
        phone: "13800000017",
        email: "chris@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
        role: "client",
        isAdmin: false,
    },
    // 运维 (DevOps)
    {
        id: "user-14",
        employeeId: "EMP018",
        password: "123456",
        name: "Alex Yang",
        phone: "13800000018",
        email: "alex@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        role: "devops",
        isAdmin: false,
    },
    {
        id: "user-15",
        employeeId: "EMP019",
        password: "123456",
        name: "Ryan Huang",
        phone: "13800000019",
        email: "ryan@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan",
        role: "devops",
        isAdmin: false,
    },
    // 动作/特效 (Animator)
    {
        id: "user-16",
        employeeId: "EMP020",
        password: "123456",
        name: "Mia Sun",
        phone: "13800000020",
        email: "mia@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
        role: "animator",
        isAdmin: false,
    },
    {
        id: "user-17",
        employeeId: "EMP021",
        password: "123456",
        name: "Daniel Wu",
        phone: "13800000021",
        email: "daniel@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel",
        role: "animator",
        isAdmin: false,
    },
    // 音效 (Sound)
    {
        id: "user-18",
        employeeId: "EMP022",
        password: "123456",
        name: "Emily Lin",
        phone: "13800000022",
        email: "emily@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
        role: "sound",
        isAdmin: false,
    },
    {
        id: "user-19",
        employeeId: "EMP023",
        password: "123456",
        name: "Frank Ma",
        phone: "13800000023",
        email: "frank@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
        role: "sound",
        isAdmin: false,
    },
    // 测试 (Tester)
    {
        id: "user-20",
        employeeId: "EMP024",
        password: "123456",
        name: "Grace Xu",
        phone: "13800000024",
        email: "grace@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace",
        role: "tester",
        isAdmin: false,
    },
    {
        id: "user-21",
        employeeId: "EMP025",
        password: "123456",
        name: "Henry Zhao",
        phone: "13800000025",
        email: "henry@example.com",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Henry",
        role: "tester",
        isAdmin: false,
    },
];

// Initial mock data
const mockProjects: Project[] = [
    {
        id: "proj-1",
        name: "英勇之地手游",
        description: "手游开发项目，包含策划、美术、程序等多个部门的协作",
        createdAt: "2026-04-20T10:00:00Z",
        nonWorkdays: [],
        extraWorkdays: [],
    },
    {
        id: "proj-2",
        name: "英勇之地端游",
        description: "端游开发项目，包含策划、美术、程序等多个部门的协作",
        createdAt: "2026-04-25T09:00:00Z",
        nonWorkdays: [],
        extraWorkdays: [],
    },
];

const mockPlannings: Planning[] = [
    // 英勇之地手游 (proj-1) 迭代
    {
        id: "plan-1",
        name: "立项与策划",
        deadline: "2026-05-15T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-04-20T10:00:00Z",
    },
    {
        id: "plan-2",
        name: "核心战斗系统",
        deadline: "2026-06-01T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-05-01T09:00:00Z",
    },
    {
        id: "plan-3",
        name: "角色养成系统",
        deadline: "2026-06-20T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-05-10T10:00:00Z",
    },
    // 英勇之地端游 (proj-2) 迭代
    {
        id: "plan-5",
        name: "引擎与框架搭建",
        deadline: "2026-05-20T00:00:00Z",
        projectId: "proj-2",
        createdAt: "2026-04-25T08:00:00Z",
    },
    {
        id: "plan-6",
        name: "场景与渲染优化",
        deadline: "2026-06-15T00:00:00Z",
        projectId: "proj-2",
        createdAt: "2026-05-05T08:00:00Z",
    },
];

const mockTasks: Task[] = [
    // ========== 手游项目 (proj-1) ==========
    // --- 立项与策划 (plan-1) ---
    {
        id: "task-1",
        title: "游戏世界观设定",
        description: "完成游戏背景故事、种族设定、职业体系",
        status: "done",
        priority: "high",
        dueDate: "2026-05-12T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-4",
        createdAt: "2026-05-04T10:00:00Z",
        updatedAt: "2026-05-12T15:00:00Z",
        stage: "completed",
        planningId: "plan-1",
        participants: [
            { roleType: "pm", memberId: "user-2", startTime: "2026-05-04T09:00:00Z", endTime: "2026-05-12T18:00:00Z" },
            { roleType: "planner", memberId: "user-4", startTime: "2026-05-04T09:00:00Z", endTime: "2026-05-12T18:00:00Z" },
        ],
        references: [
            { type: "document", url: "https://docs.example.com/world-setting", title: "世界观设定文档" },
        ],
        comments: [
            { id: "com-1", authorId: "user-2", content: "世界观设定已通过评审", createdAt: "2026-05-12T14:00:00Z" },
        ],
    },
    {
        id: "task-2",
        title: "经济系统设计",
        description: "设计游戏内货币、交易、商城系统",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-22T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-4",
        createdAt: "2026-05-11T09:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "designing",
        planningId: "plan-1",
        participants: [
            // Alice(user-2) 重叠: task-1(5/4~5/12) + task-2(5/11~5/22), 重叠日 5/11~5/12
            { roleType: "pm", memberId: "user-2", startTime: "2026-05-11T09:00:00Z", endTime: "2026-05-22T18:00:00Z" },
            // Carol(user-4) 重叠: task-1(5/4~5/12) + task-2(5/8~5/20), 重叠日 5/8~5/12
            { roleType: "planner", memberId: "user-4", startTime: "2026-05-08T09:00:00Z", endTime: "2026-05-20T18:00:00Z" },
            { roleType: "server", memberId: "user-3", startTime: "2026-05-14T09:00:00Z", endTime: "2026-05-22T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    // --- 核心战斗系统 (plan-2) ---
    {
        id: "task-3",
        title: "战斗引擎开发",
        description: "实现实时战斗逻辑、技能系统、伤害计算",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-29T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-3",
        createdAt: "2026-05-13T09:00:00Z",
        updatedAt: "2026-05-20T12:00:00Z",
        stage: "initial",
        planningId: "plan-2",
        participants: [
            { roleType: "pm", memberId: "user-2", startTime: "2026-05-13T09:00:00Z", endTime: "2026-05-29T18:00:00Z" },
            { roleType: "server", memberId: "user-3", startTime: "2026-05-18T09:00:00Z", endTime: "2026-05-29T18:00:00Z" },
            // David(user-5) 重叠: task-3(5/18~5/29) + task-4(5/14~5/25), 重叠日 5/18~5/25
            { roleType: "client", memberId: "user-5", startTime: "2026-05-18T09:00:00Z", endTime: "2026-05-29T18:00:00Z" },
        ],
        references: [
            { type: "design", url: "https://figma.com/combat-design", title: "战斗系统设计稿" },
        ],
        comments: [],
    },
    {
        id: "task-4",
        title: "战斗角色控制器",
        description: "实现角色移动、攻击、闪避等操作",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-25T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-5",
        createdAt: "2026-05-14T10:00:00Z",
        updatedAt: "2026-05-18T10:00:00Z",
        stage: "initial",
        planningId: "plan-2",
        participants: [
            // David(user-5) 重叠: task-4(5/14~5/25) + task-3(5/18~5/29), 重叠日 5/18~5/25
            { roleType: "client", memberId: "user-5", startTime: "2026-05-14T09:00:00Z", endTime: "2026-05-25T18:00:00Z" },
            // Mia(user-16) 重叠: task-4(5/20~5/25) + task-5(5/18~5/27), 重叠日 5/20~5/25
            { roleType: "animator", memberId: "user-16", startTime: "2026-05-20T09:00:00Z", endTime: "2026-05-25T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    {
        id: "task-5",
        title: "技能特效制作",
        description: "制作各职业技能特效和打击反馈",
        status: "in-progress",
        priority: "medium",
        dueDate: "2026-05-27T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-16",
        createdAt: "2026-05-15T14:00:00Z",
        updatedAt: "2026-05-18T14:00:00Z",
        stage: "designing",
        planningId: "plan-2",
        participants: [
            // Mia(user-16) 重叠: task-5(5/18~5/27) + task-4(5/20~5/25), 重叠日 5/20~5/25
            { roleType: "animator", memberId: "user-16", startTime: "2026-05-18T09:00:00Z", endTime: "2026-05-27T18:00:00Z" },
            { roleType: "artist", memberId: "user-8", startTime: "2026-05-18T09:00:00Z", endTime: "2026-05-27T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    // --- 角色养成系统 (plan-3) ---
    {
        id: "task-6",
        title: "角色升级机制",
        description: "实现角色经验值、等级提升、属性加点",
        status: "todo",
        priority: "high",
        dueDate: "2026-06-05T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-3",
        createdAt: "2026-05-18T10:00:00Z",
        updatedAt: "2026-05-18T10:00:00Z",
        stage: "filed",
        planningId: "plan-3",
        participants: [
            { roleType: "pm", memberId: "user-2", startTime: "2026-05-18T09:00:00Z", endTime: "2026-06-05T18:00:00Z" },
            // Carol(user-4) 重叠: task-2(5/8~5/20) + task-6(5/25~6/5), 无重叠（间隔）
            { roleType: "planner", memberId: "user-4", startTime: "2026-05-25T09:00:00Z", endTime: "2026-06-05T18:00:00Z" },
            { roleType: "server", memberId: "user-3", startTime: "2026-05-25T09:00:00Z", endTime: "2026-06-05T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    {
        id: "task-7",
        title: "装备系统开发",
        description: "实现装备穿戴、强化、合成、交易",
        status: "todo",
        priority: "high",
        dueDate: "2026-06-10T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-20T09:00:00Z",
        updatedAt: "2026-05-20T09:00:00Z",
        stage: "filed",
        planningId: "plan-3",
        participants: [
            { roleType: "server", memberId: "user-12", startTime: "2026-05-25T09:00:00Z", endTime: "2026-06-10T18:00:00Z" },
            { roleType: "client", memberId: "user-5", startTime: "2026-05-26T09:00:00Z", endTime: "2026-06-10T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    {
        id: "task-8",
        title: "UI界面设计-角色面板",
        description: "设计角色信息、背包、装备界面",
        status: "in-progress",
        priority: "medium",
        dueDate: "2026-05-30T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-10",
        createdAt: "2026-05-11T14:00:00Z",
        updatedAt: "2026-05-18T11:00:00Z",
        stage: "designing",
        planningId: "plan-3",
        participants: [
            { roleType: "ui", memberId: "user-10", startTime: "2026-05-11T09:00:00Z", endTime: "2026-05-30T18:00:00Z" },
            { roleType: "artist", memberId: "user-8", startTime: "2026-05-20T09:00:00Z", endTime: "2026-05-30T18:00:00Z" },
        ],
        references: [
            { type: "ui", url: "https://figma.com/character-ui", title: "角色面板UI设计" },
        ],
        comments: [],
    },
    // ========== 端游项目 (proj-2) ==========
    // --- 引擎与框架搭建 (plan-5) ---
    {
        id: "task-11",
        title: "UE5引擎配置",
        description: "配置引擎开发环境、源码管理、CI/CD流程",
        status: "done",
        priority: "high",
        dueDate: "2026-05-16T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-14",
        createdAt: "2026-05-04T08:00:00Z",
        updatedAt: "2026-05-16T17:00:00Z",
        stage: "completed",
        planningId: "plan-5",
        participants: [
            { roleType: "devops", memberId: "user-14", startTime: "2026-05-04T09:00:00Z", endTime: "2026-05-16T18:00:00Z" },
            { roleType: "pm", memberId: "user-6", startTime: "2026-05-04T09:00:00Z", endTime: "2026-05-10T18:00:00Z" },
        ],
        references: [
            { type: "document", url: "https://docs.example.com/ue5-setup", title: "引擎配置指南" },
        ],
        comments: [],
    },
    {
        id: "task-12",
        title: "网络框架搭建",
        description: "实现客户端与服务端网络通信框架",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-23T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-3",
        createdAt: "2026-05-07T09:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "preliminary",
        planningId: "plan-5",
        participants: [
            // Bob(user-3) 重叠: task-12(5/7~5/23) + task-2(5/14~5/22)跨项目
            { roleType: "server", memberId: "user-3", startTime: "2026-05-07T09:00:00Z", endTime: "2026-05-23T18:00:00Z" },
            { roleType: "client", memberId: "user-13", startTime: "2026-05-11T09:00:00Z", endTime: "2026-05-23T18:00:00Z" },
        ],
        references: [],
        comments: [
            { id: "com-3", authorId: "user-3", content: "网络同步方案已确定", createdAt: "2026-05-15T10:00:00Z" },
        ],
    },
    // --- 场景与渲染优化 (plan-6) ---
    {
        id: "task-13",
        title: "PBR材质系统",
        description: "建立统一的PBR材质工作流和规范",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-28T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-8",
        createdAt: "2026-05-06T10:00:00Z",
        updatedAt: "2026-05-20T14:00:00Z",
        stage: "initial",
        planningId: "plan-6",
        participants: [
            // Lisa(user-8) 重叠: task-13(5/6~5/28) + task-5(5/18~5/27)跨项目, 重叠日 5/18~5/27
            { roleType: "artist", memberId: "user-8", startTime: "2026-05-06T09:00:00Z", endTime: "2026-05-28T18:00:00Z" },
            { roleType: "artist", memberId: "user-9", startTime: "2026-05-06T09:00:00Z", endTime: "2026-05-20T18:00:00Z" },
        ],
        references: [
            { type: "design", url: "https://figma.com/pbr-materials", title: "PBR材质规范" },
        ],
        comments: [],
    },
    {
        id: "task-14",
        title: "大规模植被渲染",
        description: "实现百万级树木植被的高效渲染",
        status: "in-progress",
        priority: "medium",
        dueDate: "2026-05-30T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-9",
        createdAt: "2026-05-12T09:00:00Z",
        updatedAt: "2026-05-22T11:00:00Z",
        stage: "preliminary",
        planningId: "plan-6",
        participants: [
            { roleType: "server", memberId: "user-12", startTime: "2026-05-18T09:00:00Z", endTime: "2026-05-30T18:00:00Z" },
            // Tom(user-9) 重叠: task-13(5/6~5/20) + task-14(5/15~5/30), 重叠日 5/15~5/20
            { roleType: "artist", memberId: "user-9", startTime: "2026-05-15T09:00:00Z", endTime: "2026-05-30T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
    {
        id: "task-15",
        title: "动态天气系统",
        description: "实现雨、雪、风、雾等天气效果",
        status: "todo",
        priority: "medium",
        dueDate: "2026-06-08T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-16",
        createdAt: "2026-05-20T14:00:00Z",
        updatedAt: "2026-05-20T14:00:00Z",
        stage: "filed",
        planningId: "plan-6",
        participants: [
            // Mia(user-16) 重叠: task-5(5/18~5/27) + task-15(5/25~6/8), 重叠日 5/25~5/27
            { roleType: "animator", memberId: "user-16", startTime: "2026-05-25T09:00:00Z", endTime: "2026-06-08T18:00:00Z" },
            { roleType: "server", memberId: "user-12", startTime: "2026-05-28T09:00:00Z", endTime: "2026-06-08T18:00:00Z" },
        ],
        references: [],
        comments: [],
    },
];

// Storage for mock data (simulates server-side persistence)
let projects: Project[] = [...mockProjects];
let plannings: Planning[] = [...mockPlannings];
let tasks: Task[] = [...mockTasks];
let users: User[] = [...mockUsers];
let taskHistories: TaskHistory[] = [];

// Event handlers
type MockEventHandler = (data: any) => void;
const eventHandlers: Map<string, Set<MockEventHandler>> = new Map();

// Helper to trigger events
const trigger = (type: string, payload: any): void => {
    eventHandlers.get(type)?.forEach((handler) => handler(payload));
};

// Mock API functions
export const mockApi = {
    // Users
    getUsers: (): User[] => [...users],

    getUserByEmployeeId: (employeeId: string): User | undefined => {
        return users.find((u) => u.employeeId === employeeId);
    },

    getUserById: (id: string): User | undefined => {
        return users.find((u) => u.id === id);
    },

    createUser: (data: Omit<User, "id">): User => {
        const user: User = {
            ...data,
            id: generateId(),
        };
        users.push(user);
        trigger("user:create", user);
        return user;
    },

    updateUser: (id: string, data: Partial<User>): User | null => {
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) return null;
        users[index] = { ...users[index], ...data };
        trigger("user:update", users[index]);
        return users[index];
    },

    deleteUser: (id: string): boolean => {
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) return false;
        users.splice(index, 1);
        trigger("user:delete", { id });
        return true;
    },

    // Projects
    // Projects
    getProjects: (): Project[] => [...projects],

    createProject: (data: Omit<Project, "id" | "createdAt">): Project => {
        const project: Project = {
            ...data,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        projects.push(project);
        trigger("project:create", project);
        return project;
    },

    updateProject: (id: string, data: Partial<Project>): Project | null => {
        const index = projects.findIndex((p) => p.id === id);
        if (index === -1) return null;
        projects[index] = { ...projects[index], ...data };
        trigger("project:update", projects[index]);
        return projects[index];
    },

    deleteProject: (id: string): boolean => {
        const index = projects.findIndex((p) => p.id === id);
        if (index === -1) return false;
        projects.splice(index, 1);
        tasks = tasks.filter((t) => t.projectId !== id);
        plannings = plannings.filter((p) => p.projectId !== id);
        trigger("project:delete", { id });
        return true;
    },

    // Plannings
    getPlannings: (): Planning[] => [...plannings],

    getPlanningsByProject: (projectId: string): Planning[] =>
        plannings.filter((p) => p.projectId === projectId),

    createPlanning: (data: Omit<Planning, "id" | "createdAt">): Planning => {
        const planning: Planning = {
            ...data,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        plannings.push(planning);
        trigger("planning:create", planning);
        return planning;
    },

    updatePlanning: (id: string, data: Partial<Planning>): Planning | null => {
        const index = plannings.findIndex((p) => p.id === id);
        if (index === -1) return null;
        plannings[index] = { ...plannings[index], ...data };
        trigger("planning:update", plannings[index]);
        return plannings[index];
    },

    deletePlanning: (id: string): boolean => {
        const index = plannings.findIndex((p) => p.id === id);
        if (index === -1) return false;
        plannings.splice(index, 1);
        tasks = tasks.map((t) =>
            t.planningId === id ? { ...t, planningId: null } : t,
        );
        trigger("planning:delete", { id });
        return true;
    },

    // Tasks
    getTasks: (): Task[] => [...tasks],

    getTasksByProject: (projectId: string): Task[] =>
        tasks.filter((t) => t.projectId === projectId),

    getTasksByStatus: (status: TaskStatus): Task[] =>
        tasks.filter((t) => t.status === status),

    getTasksByPlanning: (planningId: string): Task[] =>
        tasks.filter((t) => t.planningId === planningId),

    createTask: (data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task => {
        const task: Task = {
            ...data,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        tasks.push(task);
        trigger("task:create", task);
        return task;
    },

    updateTask: (id: string, data: Partial<Task>): Task | null => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return null;
        tasks[index] = {
            ...tasks[index],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        trigger("task:update", tasks[index]);
        return tasks[index];
    },

    deleteTask: (id: string): boolean => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return false;
        tasks.splice(index, 1);
        trigger("task:delete", { id });
        return true;
    },

    // Task History
    getTaskHistories: (taskId: string): TaskHistory[] =>
        taskHistories.filter((h) => h.taskId === taskId).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),

    addTaskHistory: (entry: Omit<TaskHistory, "id" | "createdAt">): TaskHistory => {
        const history: TaskHistory = {
            ...entry,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        taskHistories.push(history);
        trigger("task:history:add", history);
        return history;
    },

    // Events
    on: (type: string, handler: MockEventHandler): void => {
        if (!eventHandlers.has(type)) {
            eventHandlers.set(type, new Set());
        }
        eventHandlers.get(type)!.add(handler);
    },

    off: (type: string, handler: MockEventHandler): void => {
        eventHandlers.get(type)?.delete(handler);
    },

    // Sync initial data
    getInitialData: () => ({
        projects: [...projects],
        plannings: [...plannings],
        tasks: [...tasks],
        users: [...users],
    }),

    // Reset to initial state
    reset: (): void => {
        projects = [...mockProjects];
        plannings = [...mockPlannings];
        tasks = [...mockTasks];
        users = [...mockUsers];
        taskHistories = [];
    },
};

export default mockApi;
