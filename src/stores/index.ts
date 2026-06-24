// Pinia store configuration

import { createPinia } from "pinia";
import { useProjectStore } from "./project";
import { useMemberStore } from "./member";
import { useTaskStore } from "./task";
import { usePlanningStore } from "./planning";
import { useUserStore } from "./user";
import { useNotificationStore } from "./notification";
import { useApprovalStore } from "./approval";
import { wsService } from "@/utils/websocket";
import { getWebSocketUrl, loadAppConfig } from "@/utils/config";

export const pinia = createPinia();

// Export stores
export {
    useProjectStore,
    useMemberStore,
    useTaskStore,
    usePlanningStore,
    useUserStore,
    useNotificationStore,
    useApprovalStore,
};

// Initialize all stores with API data
class StoresManager {
    public projectStore: any = null;
    public memberStore: any = null;
    public taskStore: any = null;
    public planningStore: any = null;
    public userStore: any = null;
    public notificationStore: any = null;
    public approvalStore: any = null;
    public isReady = false;
    public isDataReady = false;
    private initPromise: Promise<void> | null = null;
    private dataInitPromise: Promise<void> | null = null;
    private connectedUserId: string | null = null;
    private hasSyncInitHandler = false;
    private visibilityHandler: (() => void) | null = null;

    constructor() {}

    private ensureStores() {
        this.projectStore = useProjectStore();
        this.memberStore = useMemberStore();
        this.taskStore = useTaskStore();
        this.planningStore = usePlanningStore();
        this.userStore = useUserStore();
        this.notificationStore = useNotificationStore();
        this.approvalStore = useApprovalStore();
    }

    async init(force = false) {
        if (this.isReady && !force) return;
        if (this.initPromise && !force) return this.initPromise;

        this.initPromise = (async () => {
            this.ensureStores();

            await this.userStore.init(force);

            if (this.userStore.isLoggedIn) {
                await this.initDataAndWebSocket();
            } else {
                this.clearData();
            }

            this.isReady = true;
        })().finally(() => {
            this.initPromise = null;
        });

        return this.initPromise;
    }

    async initDataAndWebSocket() {
        this.ensureStores();

        const userId = this.userStore.currentUser?.id;
        if (!userId) return;

        if (this.connectedUserId === userId && wsService.connected) {
            return;
        }

        if (this.dataInitPromise && this.connectedUserId === userId) {
            return this.dataInitPromise;
        }

        this.connectedUserId = userId;
        this.isDataReady = false;

        this.dataInitPromise = (async () => {
            await loadAppConfig();
            this.registerSyncInitHandler();

            wsService.onKick(() => {
                void this.handleKick();
            });

            wsService.connect(getWebSocketUrl(), userId);

            // 获取通知未读数
            this.notificationStore?.fetchUnreadCount?.();

            // 获取待审批数量（仅 PM/管理员）
            if (this.userStore?.isProjectManager) {
                this.approvalStore?.fetchApprovals?.({ status: 'pending' });
            }

            // 页面可见性变化时，通过 REST API 补拉最新任务数据
            this.visibilityHandler = () => {
                if (document.visibilityState === 'visible') {
                    const projectId = this.projectStore?.currentProjectId;
                    if (projectId) {
                        console.log('[Visibility] Tab visible, fetching tasks for project', projectId);
                        this.taskStore?.fetchTasks?.(projectId);
                    }
                }
            };
            document.addEventListener('visibilitychange', this.visibilityHandler);
        })().finally(() => {
            this.dataInitPromise = null;
        });

        return this.dataInitPromise;
    }

    clearData() {
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        this.projectStore?.clearData?.();
        this.memberStore?.clearData?.();
        this.taskStore?.clearData?.();
        this.planningStore?.clearData?.();
        this.notificationStore?.clearData?.();
        this.approvalStore?.clearData?.();
        this.connectedUserId = null;
        this.isDataReady = false;
    }

    async logout() {
        this.ensureStores();
        await this.userStore.logout();
        this.clearData();
    }

    private registerSyncInitHandler() {
        if (this.hasSyncInitHandler) return;

        wsService.on('sync:init', (data: any) => {
            this.applySyncData(data);
        });

        wsService.on('sync:update', (data: any) => {
            console.log('[WS] sync:update received', data);
            this.applySyncData(data);
        });

        this.hasSyncInitHandler = true;
    }

    private applySyncData(data: any) {
        console.log('[WS] Received sync:init', data);

        if (data.projects) {
            this.projectStore.setProjects(data.projects);
        }

        if (data.plannings) {
            this.planningStore.setPlannings(data.plannings);
        }

        if (data.tasks) {
            this.taskStore.setTasks(data.tasks);
        }

        if (data.users) {
            this.memberStore.setMembers(data.users);
        }

        this.isDataReady = true;
    }

    private async handleKick() {
        await this.userStore.logout();
        this.clearData();
        window.location.href = '/login';
    }
}

export const storesManager = new StoresManager();
