// Pinia store configuration

import { createPinia } from "pinia";
import { useProjectStore } from "./project";
import { useMemberStore } from "./member";
import { useTaskStore } from "./task";
import { usePlanningStore } from "./planning";
import { useUserStore } from "./user";

export const pinia = createPinia();

// Export stores
export {
    useProjectStore,
    useMemberStore,
    useTaskStore,
    usePlanningStore,
    useUserStore,
};

// Initialize all stores with mock data
class StoresManager {
    public projectStore: any = null;
    public memberStore: any = null;
    public taskStore: any = null;
    public planningStore: any = null;
    public userStore: any = null;

    constructor() {}

    init() {
        this.projectStore = useProjectStore();
        this.memberStore = useMemberStore();
        this.taskStore = useTaskStore();
        this.planningStore = usePlanningStore();
        this.userStore = useUserStore();

        this.projectStore.init();
        this.memberStore.init();
        this.taskStore.init();
        this.planningStore.init();
        this.userStore.init();
    }
}

export const storesManager = new StoresManager();
