// Mock data and operations for development without a server

import type {
    Project,
    Task,
    TaskStatus,
    TaskHistory,
    TaskProgressHistory,
    Planning,
    User,
} from "@/types";
import {
    createDefaultPhaseTemplates,
    createLegacyTaskPhase,
    deriveStageFromPhase,
    deriveStatusFromPhases,
    getCurrentTaskPhase,
    normalizePhaseTemplates,
    normalizeTaskPhases,
} from "@/utils/taskPhases";

type ProjectSeed = Omit<Project, "phaseTemplates"> & Partial<Pick<Project, "phaseTemplates">>;
type TaskSeed = Omit<Task, "itemType" | "parentRequirementId" | "phases" | "currentPhaseId"> &
    Partial<Pick<Task, "itemType" | "parentRequirementId" | "phases" | "currentPhaseId">>;
type MockUser = User & { password: string };

// Generate unique IDs
const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const toPublicUser = (user: MockUser): User => {
    const { password: _password, ...publicUser } = user;
    return publicUser;
};

// Initial mock data
const mockUsers: MockUser[] = [
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
const mockProjects: ProjectSeed[] = [
    {
        id: "proj-1",
        name: "英勇之地手游",
        description: "手游开发项目，包含策划、美术、程序等多个部门的协作",
        createdAt: "2026-04-20T10:00:00Z",
        defaultReviewerId: "user-pm-1",
        nonWorkdays: [],
        extraWorkdays: [],
    },
    {
        id: "proj-2",
        name: "英勇之地端游",
        description: "端游开发项目，包含策划、美术、程序等多个部门的协作",
        createdAt: "2026-04-25T00:00:00Z",
        defaultReviewerId: "user-pm-1",
        nonWorkdays: [],
        extraWorkdays: [],
    },
];

const mockPlannings: Planning[] = [
    // 英勇之地手游 (proj-1) 迭代
    {
        id: "plan-1",
        name: "立项与策划",
        color: null,
        deadline: "2026-05-15T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-04-20T10:00:00Z",
    },
    {
        id: "plan-2",
        name: "核心战斗系统",
        color: null,
        deadline: "2026-06-01T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-05-01T00:00:00Z",
    },
    {
        id: "plan-3",
        name: "角色养成系统",
        color: null,
        deadline: "2026-06-20T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-05-10T10:00:00Z",
    },
    // 英勇之地手游 (proj-1) 已完成迭代
    {
        id: "plan-4",
        name: "美术资源制作",
        color: null,
        deadline: "2026-05-30T00:00:00Z",
        projectId: "proj-1",
        createdAt: "2026-04-25T08:00:00Z",
    },
    // 英勇之地端游 (proj-2) 迭代
    {
        id: "plan-5",
        name: "引擎与框架搭建",
        color: null,
        deadline: "2026-05-20T00:00:00Z",
        projectId: "proj-2",
        createdAt: "2026-04-25T08:00:00Z",
    },
    {
        id: "plan-6",
        name: "场景与渲染优化",
        color: null,
        deadline: "2026-06-15T00:00:00Z",
        projectId: "proj-2",
        createdAt: "2026-05-05T08:00:00Z",
    },
];

const normalizeProject = (project: ProjectSeed | Project): Project => ({
    ...project,
    phaseTemplates: normalizePhaseTemplates(project.phaseTemplates),
});

const normalizeTask = (task: TaskSeed | Task): Task => {
    const itemType = task.itemType || "task";
    const existingPhases = normalizeTaskPhases(task.phases);
    const phases = itemType === "requirement"
        ? []
        : existingPhases.length > 0
            ? existingPhases
            : [createLegacyTaskPhase(task.stage || "filed", task.assigneeId || null, task.status || "todo")];
    const currentPhase = getCurrentTaskPhase(phases);
    const stage = itemType === "requirement"
        ? "filed"
        : deriveStageFromPhase(currentPhase, task.stage || "filed");
    const status = itemType === "requirement"
        ? task.status
        : deriveStatusFromPhases(phases, task.status || "todo");
    return {
        ...task,
        itemType,
        parentRequirementId: itemType === "requirement" ? null : task.parentRequirementId || null,
        assigneeId: itemType === "requirement" ? null : currentPhase?.assigneeId || task.assigneeId || null,
        dueDate: itemType === "requirement" ? null : task.dueDate,
        stage,
        status,
        phases,
        currentPhaseId: currentPhase?.id || null,
    };
};

const mockTasks: TaskSeed[] = [
    // ========== 手游项目 (proj-1) ==========
    // --- 立项与策划 (plan-1) ---

    // 需求单: 游戏世界观设计
    {
        id: "req-1",
        itemType: "requirement",
        parentRequirementId: null,
        title: "游戏世界观设计",
        description: "完成游戏世界观的整体设计，包括背景故事、种族设定、职业体系等核心内容",
        status: "done",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-04T10:00:00Z",
        updatedAt: "2026-05-12T15:00:00Z",
        stage: "completed",
        planningId: "plan-1",

        references: [
            { type: "document", url: "https://docs.example.com/world-setting", title: "世界观设定文档" },
        ],
        comments: [
            { id: "com-1", authorId: "user-2", content: "世界观设定已通过评审", createdAt: "2026-05-12T14:00:00Z" },
        ],
    },
    // 子任务: 游戏世界观设定
    {
        id: "task-1",
        itemType: "task",
        parentRequirementId: "req-1",
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
        references: [],
        comments: [],
    },

    // 需求单: 经济系统设计
    {
        id: "req-2",
        itemType: "requirement",
        parentRequirementId: null,
        title: "经济系统设计",
        description: "设计游戏内完整的经济体系，包括货币系统、交易系统、商城系统",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-11T00:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "designing",
        planningId: "plan-1",

        references: [],
        comments: [],
    },
    // 子任务: 经济系统设计
    {
        id: "task-2",
        itemType: "task",
        parentRequirementId: "req-2",
        title: "经济系统设计",
        description: "设计游戏内货币、交易、商城系统",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-22T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-4",
        createdAt: "2026-05-11T00:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "designing",
        planningId: "plan-1",
        references: [],
        comments: [],
    },

    // --- 核心战斗系统 (plan-2) ---

    // 需求单: 战斗系统开发
    {
        id: "req-3",
        itemType: "requirement",
        parentRequirementId: null,
        title: "战斗系统开发",
        description: "开发完整的核心战斗系统，包括战斗引擎、角色控制、技能特效",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-13T00:00:00Z",
        updatedAt: "2026-05-20T12:00:00Z",
        stage: "initial",
        planningId: "plan-2",

        references: [
            { type: "design", url: "https://figma.com/combat-design", title: "战斗系统设计稿" },
        ],
        comments: [],
    },
    // 子任务: 战斗引擎开发
    {
        id: "task-3",
        itemType: "task",
        parentRequirementId: "req-3",
        title: "战斗引擎开发",
        description: "实现实时战斗逻辑、技能系统、伤害计算",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-29T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-3",
        createdAt: "2026-05-13T00:00:00Z",
        updatedAt: "2026-05-20T12:00:00Z",
        stage: "initial",
        planningId: "plan-2",
        references: [],
        comments: [],
    },
    // 子任务: 战斗角色控制器
    {
        id: "task-4",
        itemType: "task",
        parentRequirementId: "req-3",
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
        references: [],
        comments: [],
    },
    // 子任务: 技能特效制作
    {
        id: "task-5",
        itemType: "task",
        parentRequirementId: "req-3",
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
        references: [],
        comments: [],
    },

    // --- 角色养成系统 (plan-3) ---

    // 需求单: 角色养成系统开发
    {
        id: "req-4",
        itemType: "requirement",
        parentRequirementId: null,
        title: "角色养成系统开发",
        description: "开发完整的角色养成系统，包括等级提升、装备系统、UI界面",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-18T10:00:00Z",
        updatedAt: "2026-05-20T00:00:00Z",
        stage: "designing",
        planningId: "plan-3",

        references: [],
        comments: [],
    },
    // 子任务: 角色升级机制
    {
        id: "task-6",
        itemType: "task",
        parentRequirementId: "req-4",
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
        phases: [
            {
                id: "task-6-phase-1",
                templateId: "filed",
                name: "Plan Review",
                order: 0,
                assigneeId: "user-2",
                progress: 100,
                status: "done",
                startTime: "2026-05-18T01:30:00Z",
                endTime: "2026-05-22T10:30:00Z",
            },
            {
                id: "task-6-phase-2",
                templateId: "designing",
                name: "System Design",
                order: 1,
                assigneeId: "user-4",
                progress: 100,
                status: "done",
                startTime: "2026-05-25T01:30:00Z",
                endTime: "2026-06-05T10:30:00Z",
            },
            {
                id: "task-6-phase-3",
                templateId: "initial",
                name: "Server Dev",
                order: 2,
                assigneeId: "user-3",
                progress: 35,
                status: "in-progress",
                startTime: "2026-06-08T01:30:00Z",
                endTime: "2026-06-19T10:30:00Z",
            },
        ],
        references: [],
        comments: [],
    },
    // 子任务: 装备系统开发
    {
        id: "task-7",
        itemType: "task",
        parentRequirementId: "req-4",
        title: "装备系统开发",
        description: "实现装备穿戴、强化、合成、交易",
        status: "todo",
        priority: "high",
        dueDate: "2026-06-10T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-20T00:00:00Z",
        updatedAt: "2026-05-20T00:00:00Z",
        stage: "filed",
        planningId: "plan-3",
        phases: [
            {
                id: "task-7-phase-1",
                templateId: "filed",
                name: "Plan Review",
                order: 0,
                assigneeId: "user-2",
                progress: 100,
                status: "done",
                startTime: "2026-06-10T01:30:00Z",
                endTime: "2026-06-12T10:30:00Z",
            },
            {
                id: "task-7-phase-2",
                templateId: "designing",
                name: "Data Model",
                order: 1,
                assigneeId: "user-12",
                progress: 80,
                status: "in-progress",
                startTime: "2026-06-12T01:30:00Z",
                endTime: "2026-06-19T10:30:00Z",
            },
            {
                id: "task-7-phase-3",
                templateId: "initial",
                name: "Client Hook",
                order: 2,
                assigneeId: "user-5",
                progress: 0,
                status: "pending",
                startTime: "2026-06-18T01:30:00Z",
                endTime: "2026-06-19T10:30:00Z",
            },
        ],
        references: [],
        comments: [],
    },
    // 子任务: UI界面设计-角色面板
    {
        id: "task-8",
        itemType: "task",
        parentRequirementId: "req-4",
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
        phases: [
            {
                id: "task-8-phase-1",
                templateId: "designing",
                name: "UI Draft",
                order: 0,
                assigneeId: "user-10",
                progress: 60,
                status: "in-progress",
                startTime: "2026-05-20T01:30:00Z",
                endTime: "2026-05-30T10:30:00Z",
            },
            {
                id: "task-8-phase-2",
                templateId: "initial",
                name: "Art Polish",
                order: 1,
                assigneeId: "user-3",
                progress: 0,
                status: "pending",
                startTime: "2026-06-17T01:30:00Z",
                endTime: "2026-06-19T10:30:00Z",
            },
        ],
        references: [
            { type: "ui", url: "https://figma.com/character-ui", title: "角色面板UI设计" },
        ],
        comments: [],
    },

    // 需求单: 社交系统开发（包含多种状态的任务）
    {
        id: "req-7",
        itemType: "requirement",
        parentRequirementId: null,
        title: "社交系统开发",
        description: "开发游戏内社交功能，包括好友系统、聊天系统、公会系统、排行榜等",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-20T10:00:00Z",
        updatedAt: "2026-05-25T16:00:00Z",
        stage: "initial",
        planningId: "plan-2",

        references: [
            { type: "document", url: "https://docs.example.com/social-system", title: "社交系统设计文档" },
        ],
        comments: [
            { id: "com-10", authorId: "user-2", content: "社交系统需求评审通过", createdAt: "2026-05-20T14:00:00Z" },
        ],
    },
    // 子任务1: 好友系统（已完成）
    {
        id: "task-20",
        itemType: "task",
        parentRequirementId: "req-7",
        title: "好友系统",
        description: "实现好友添加、删除、在线状态、好友列表功能",
        status: "done",
        priority: "high",
        dueDate: "2026-05-25T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-20T10:00:00Z",
        updatedAt: "2026-05-25T18:00:00Z",
        stage: "completed",
        planningId: "plan-2",
        references: [],
        comments: [
            { id: "com-11", authorId: "user-12", content: "好友系统开发完成，已通过测试", createdAt: "2026-05-25T17:00:00Z" },
        ],
    },
    // 子任务2: 聊天系统（进行中）
    {
        id: "task-21",
        itemType: "task",
        parentRequirementId: "req-7",
        title: "聊天系统",
        description: "实现私聊、世界频道、公会频道等聊天功能",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-30T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-3",
        createdAt: "2026-05-22T08:00:00Z",
        updatedAt: "2026-05-28T10:00:00Z",
        stage: "initial",
        planningId: "plan-2",
        references: [],
        comments: [],
    },
    // 子任务3: 公会系统（待办）
    {
        id: "task-22",
        itemType: "task",
        parentRequirementId: "req-7",
        title: "公会系统",
        description: "实现公会创建、加入、退出、公会管理功能",
        status: "todo",
        priority: "medium",
        dueDate: "2026-06-05T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-25T14:00:00Z",
        updatedAt: "2026-05-25T14:00:00Z",
        stage: "filed",
        planningId: "plan-2",
        references: [],
        comments: [],
    },
    // 子任务4: 排行榜系统（已废弃）
    {
        id: "task-23",
        itemType: "task",
        parentRequirementId: "req-7",
        title: "排行榜系统",
        description: "实现战力排行、等级排行、公会排行等",
        status: "abandoned",
        priority: "low",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-20T10:00:00Z",
        updatedAt: "2026-05-26T09:00:00Z",
        stage: "filed",
        planningId: "plan-2",

        references: [],
        comments: [
            { id: "com-12", authorId: "user-2", content: "排行榜功能移至下个版本实现", createdAt: "2026-05-26T09:00:00Z" },
        ],
    },

    // 需求单: 商城系统开发（包含多种状态的任务）
    {
        id: "req-8",
        itemType: "requirement",
        parentRequirementId: null,
        title: "商城系统开发",
        description: "开发游戏内商城功能，包括商品展示、购买流程、礼包系统、充值接口",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-05-18T08:00:00Z",
        updatedAt: "2026-05-28T14:00:00Z",
        stage: "initial",
        planningId: "plan-3",

        references: [],
        comments: [],
    },
    // 子任务1: 商品配置系统（已完成）
    {
        id: "task-24",
        itemType: "task",
        parentRequirementId: "req-8",
        title: "商品配置系统",
        description: "实现商品数据配置、上下架管理、价格设置",
        status: "done",
        priority: "high",
        dueDate: "2026-05-22T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-18T08:00:00Z",
        updatedAt: "2026-05-22T16:00:00Z",
        stage: "completed",
        planningId: "plan-3",
        references: [],
        comments: [],
    },
    // 子任务2: 商城界面开发（进行中）
    {
        id: "task-25",
        itemType: "task",
        parentRequirementId: "req-8",
        title: "商城界面开发",
        description: "实现商城主界面、商品详情、购买弹窗等UI",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-28T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-10",
        createdAt: "2026-05-20T10:00:00Z",
        updatedAt: "2026-05-26T14:00:00Z",
        stage: "initial",
        planningId: "plan-3",
        references: [
            { type: "ui", url: "https://figma.com/shop-ui", title: "商城UI设计稿" },
        ],
        comments: [],
    },
    // 子任务3: 支付接口对接（进行中）
    {
        id: "task-26",
        itemType: "task",
        parentRequirementId: "req-8",
        title: "支付接口对接",
        description: "对接第三方支付SDK，实现充值、购买流程",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-06-01T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-3",
        createdAt: "2026-05-22T08:00:00Z",
        updatedAt: "2026-05-28T11:00:00Z",
        stage: "designing",
        planningId: "plan-3",
        references: [],
        comments: [],
    },
    // 子任务4: 礼包系统（待办）
    {
        id: "task-27",
        itemType: "task",
        parentRequirementId: "req-8",
        title: "礼包系统",
        description: "实现首充礼包、限时礼包、等级礼包等",
        status: "todo",
        priority: "medium",
        dueDate: "2026-06-08T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-12",
        createdAt: "2026-05-25T10:00:00Z",
        updatedAt: "2026-05-25T10:00:00Z",
        stage: "filed",
        planningId: "plan-3",
        references: [],
        comments: [],
    },

    // --- 美术资源制作 (plan-4) - 已完成迭代 ---

    // 需求单: 角色美术资源
    {
        id: "req-9",
        itemType: "requirement",
        parentRequirementId: null,
        title: "角色美术资源",
        description: "完成游戏内主要角色的美术资源制作，包括角色立绘、模型、动画",
        status: "done",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-04-25T08:00:00Z",
        updatedAt: "2026-05-28T16:00:00Z",
        stage: "completed",
        planningId: "plan-4",

        references: [
            { type: "design", url: "https://figma.com/character-art", title: "角色美术设计稿" },
        ],
        comments: [
            { id: "com-20", authorId: "user-8", content: "全部角色美术资源已完成并通过审核", createdAt: "2026-05-28T15:00:00Z" },
        ],
    },
    // 子任务: 主角立绘设计
    {
        id: "task-30",
        itemType: "task",
        parentRequirementId: "req-9",
        title: "主角立绘设计",
        description: "完成男女主角各4套服装的立绘设计",
        status: "done",
        priority: "high",
        dueDate: "2026-05-10T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-8",
        createdAt: "2026-04-25T08:00:00Z",
        updatedAt: "2026-05-10T16:00:00Z",
        stage: "completed",
        planningId: "plan-4",
        references: [],
        comments: [],
    },
    // 子任务: NPC模型制作
    {
        id: "task-31",
        itemType: "task",
        parentRequirementId: "req-9",
        title: "NPC模型制作",
        description: "完成20个主要NPC的3D模型和贴图",
        status: "done",
        priority: "high",
        dueDate: "2026-05-20T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-9",
        createdAt: "2026-04-28T10:00:00Z",
        updatedAt: "2026-05-20T18:00:00Z",
        stage: "completed",
        planningId: "plan-4",
        references: [],
        comments: [],
    },
    // 子任务: 角色动作动画
    {
        id: "task-32",
        itemType: "task",
        parentRequirementId: "req-9",
        title: "角色动作动画",
        description: "制作角色移动、攻击、待机等基础动画",
        status: "done",
        priority: "medium",
        dueDate: "2026-05-25T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-16",
        createdAt: "2026-05-05T10:00:00Z",
        updatedAt: "2026-05-25T17:00:00Z",
        stage: "completed",
        planningId: "plan-4",
        references: [],
        comments: [],
    },

    // 需求单: 场景美术资源
    {
        id: "req-10",
        itemType: "requirement",
        parentRequirementId: null,
        title: "场景美术资源",
        description: "完成游戏主城、野外、副本等场景的美术资源制作",
        status: "done",
        priority: "high",
        dueDate: null,
        projectId: "proj-1",
        assigneeId: null,
        createdAt: "2026-04-28T08:00:00Z",
        updatedAt: "2026-05-28T18:00:00Z",
        stage: "completed",
        planningId: "plan-4",

        references: [],
        comments: [
            { id: "com-21", authorId: "user-2", content: "场景美术资源全部验收通过", createdAt: "2026-05-28T17:00:00Z" },
        ],
    },
    // 子任务: 主城场景建模
    {
        id: "task-33",
        itemType: "task",
        parentRequirementId: "req-10",
        title: "主城场景建模",
        description: "完成主城场景的3D建模、材质和灯光",
        status: "done",
        priority: "high",
        dueDate: "2026-05-15T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-9",
        createdAt: "2026-04-28T08:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "completed",
        planningId: "plan-4",
        references: [],
        comments: [],
    },
    // 子任务: 野外场景制作
    {
        id: "task-34",
        itemType: "task",
        parentRequirementId: "req-10",
        title: "野外场景制作",
        description: "完成森林、沙漠、雪地等3个野外场景",
        status: "done",
        priority: "medium",
        dueDate: "2026-05-22T00:00:00Z",
        projectId: "proj-1",
        assigneeId: "user-8",
        createdAt: "2026-05-02T10:00:00Z",
        updatedAt: "2026-05-22T18:00:00Z",
        stage: "completed",
        planningId: "plan-4",
        references: [],
        comments: [],
    },

    // ========== 端游项目 (proj-2) ==========
    // --- 引擎与框架搭建 (plan-5) ---

    // 需求单: 开发环境搭建
    {
        id: "req-5",
        itemType: "requirement",
        parentRequirementId: null,
        title: "开发环境搭建",
        description: "搭建端游项目的开发环境，包括引擎配置、网络框架",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-2",
        assigneeId: null,
        createdAt: "2026-05-04T08:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "preliminary",
        planningId: "plan-5",

        references: [
            { type: "document", url: "https://docs.example.com/ue5-setup", title: "引擎配置指南" },
        ],
        comments: [],
    },
    // 子任务: UE5引擎配置
    {
        id: "task-11",
        itemType: "task",
        parentRequirementId: "req-5",
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
        references: [],
        comments: [],
    },
    // 子任务: 网络框架搭建
    {
        id: "task-12",
        itemType: "task",
        parentRequirementId: "req-5",
        title: "网络框架搭建",
        description: "实现客户端与服务端网络通信框架",
        status: "in-progress",
        priority: "high",
        dueDate: "2026-05-23T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-3",
        createdAt: "2026-05-07T00:00:00Z",
        updatedAt: "2026-05-15T16:00:00Z",
        stage: "preliminary",
        planningId: "plan-5",
        references: [],
        comments: [
            { id: "com-3", authorId: "user-3", content: "网络同步方案已确定", createdAt: "2026-05-15T10:00:00Z" },
        ],
    },

    // --- 场景与渲染优化 (plan-6) ---

    // 需求单: 场景渲染系统
    {
        id: "req-6",
        itemType: "requirement",
        parentRequirementId: null,
        title: "场景渲染系统",
        description: "开发场景渲染相关系统，包括材质、植被、天气效果",
        status: "in-progress",
        priority: "high",
        dueDate: null,
        projectId: "proj-2",
        assigneeId: null,
        createdAt: "2026-05-06T10:00:00Z",
        updatedAt: "2026-05-22T11:00:00Z",
        stage: "initial",
        planningId: "plan-6",

        references: [
            { type: "design", url: "https://figma.com/pbr-materials", title: "PBR材质规范" },
        ],
        comments: [],
    },
    // 子任务: PBR材质系统
    {
        id: "task-13",
        itemType: "task",
        parentRequirementId: "req-6",
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
        references: [],
        comments: [],
    },
    // 子任务: 大规模植被渲染
    {
        id: "task-14",
        itemType: "task",
        parentRequirementId: "req-6",
        title: "大规模植被渲染",
        description: "实现百万级树木植被的高效渲染",
        status: "in-progress",
        priority: "medium",
        dueDate: "2026-05-30T00:00:00Z",
        projectId: "proj-2",
        assigneeId: "user-9",
        createdAt: "2026-05-12T00:00:00Z",
        updatedAt: "2026-05-22T11:00:00Z",
        stage: "preliminary",
        planningId: "plan-6",
        references: [],
        comments: [],
    },
    // 子任务: 动态天气系统
    {
        id: "task-15",
        itemType: "task",
        parentRequirementId: "req-6",
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
        references: [],
        comments: [],
    },
];

const mockTaskProgressHistories: TaskProgressHistory[] = [
    {
        id: "progress-history-1",
        taskId: "task-7",
        phaseId: "task-7-phase-2",
        phaseName: "Data Model",
        assigneeId: "user-12",
        operatorId: "user-3",
        oldProgress: 20,
        newProgress: 80,
        createdAt: "2026-06-16T10:15:00Z",
    },
    {
        id: "progress-history-2",
        taskId: "task-6",
        phaseId: "task-6-phase-3",
        phaseName: "Server Dev",
        assigneeId: "user-3",
        operatorId: "user-3",
        oldProgress: 20,
        newProgress: 35,
        createdAt: "2026-06-15T17:40:00Z",
    },
    {
        id: "progress-history-3",
        taskId: "task-8",
        phaseId: "task-8-phase-1",
        phaseName: "UI Draft",
        assigneeId: "user-10",
        operatorId: "user-10",
        oldProgress: 15,
        newProgress: 60,
        createdAt: "2026-06-14T14:05:00Z",
    },
    {
        id: "progress-history-4",
        taskId: "task-7",
        phaseId: "task-7-phase-1",
        phaseName: "Plan Review",
        assigneeId: "user-2",
        operatorId: "user-2",
        oldProgress: 70,
        newProgress: 100,
        createdAt: "2026-06-12T18:30:00Z",
    },
];

// Storage for mock data (simulates server-side persistence)
let projects: Project[] = mockProjects.map(normalizeProject);
let plannings: Planning[] = [...mockPlannings];
let tasks: Task[] = mockTasks.map(normalizeTask);
let users: MockUser[] = [...mockUsers];
let taskHistories: TaskHistory[] = [];
let taskProgressHistories: TaskProgressHistory[] = [...mockTaskProgressHistories];

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
    getUsers: (): User[] => users.map(toPublicUser),

    getUserByEmployeeId: (employeeId: string): MockUser | undefined => {
        return users.find((u) => u.employeeId === employeeId);
    },

    getUserById: (id: string): User | undefined => {
        const user = users.find((u) => u.id === id);
        return user ? toPublicUser(user) : undefined;
    },

    createUser: (data: Omit<User, "id"> & { password: string }): User => {
        const user: MockUser = {
            ...data,
            id: generateId(),
        };
        users.push(user);
        const publicUser = toPublicUser(user);
        trigger("user:create", publicUser);
        return publicUser;
    },

    updateUser: (id: string, data: Partial<User> & { password?: string }): User | null => {
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) return null;
        users[index] = { ...users[index], ...data };
        const publicUser = toPublicUser(users[index]);
        trigger("user:update", publicUser);
        return publicUser;
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
    getProjects: (): Project[] => projects.map(normalizeProject),

    createProject: (data: Omit<Project, "id" | "createdAt">): Project => {
        const project: Project = normalizeProject({
            ...data,
            phaseTemplates: data.phaseTemplates || createDefaultPhaseTemplates(),
            id: generateId(),
            createdAt: new Date().toISOString(),
        });
        projects.push(project);
        trigger("project:create", project);
        return project;
    },

    updateProject: (id: string, data: Partial<Project>): Project | null => {
        const index = projects.findIndex((p) => p.id === id);
        if (index === -1) return null;
        projects[index] = normalizeProject({ ...projects[index], ...data });
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
    getTasks: (): Task[] => tasks.map(normalizeTask),

    getTasksByProject: (projectId: string): Task[] =>
        tasks.filter((t) => t.projectId === projectId).map(normalizeTask),

    getTasksByStatus: (status: TaskStatus): Task[] =>
        tasks.filter((t) => t.status === status).map(normalizeTask),

    getTasksByPlanning: (planningId: string): Task[] =>
        tasks.filter((t) => t.planningId === planningId).map(normalizeTask),

    createTask: (data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task => {
        const task: Task = {
            ...data,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const normalized = normalizeTask(task);
        tasks.push(normalized);
        trigger("task:create", normalized);
        return normalized;
    },

    updateTask: (id: string, data: Partial<Task>): Task | null => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return null;
        tasks[index] = normalizeTask({
            ...tasks[index],
            ...data,
            updatedAt: new Date().toISOString(),
        });
        trigger("task:update", tasks[index]);
        return tasks[index];
    },

    deleteTask: (id: string): boolean => {
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return false;

        const task = tasks[index];
        if (task.itemType !== "requirement") {
            if (task.status === "abandoned") return true;
            tasks[index] = normalizeTask({
                ...task,
                status: "abandoned",
                updatedAt: new Date().toISOString(),
            });
            trigger("task:update", tasks[index]);
            return true;
        }

        const childCount = tasks.filter((t) => t.itemType !== "requirement" && t.parentRequirementId === id).length;
        if (childCount > 0) return false;

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

    getTaskProgressHistories: (taskId: string): TaskProgressHistory[] =>
        taskProgressHistories.filter((h) => h.taskId === taskId).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),

    addTaskProgressHistory: (entry: Omit<TaskProgressHistory, "id" | "createdAt">): TaskProgressHistory => {
        const history: TaskProgressHistory = {
            ...entry,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        taskProgressHistories.push(history);
        trigger("task:progress-history:add", history);
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
        projects: projects.map(normalizeProject),
        plannings: [...plannings],
        tasks: tasks.map(normalizeTask),
        users: users.map(toPublicUser),
    }),

    // Reset to initial state
    reset: (): void => {
        projects = mockProjects.map(normalizeProject);
        plannings = [...mockPlannings];
        tasks = mockTasks.map(normalizeTask);
        users = [...mockUsers];
        taskHistories = [];
        taskProgressHistories = [...mockTaskProgressHistories];
    },
};

export default mockApi;
