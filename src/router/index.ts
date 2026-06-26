// Vue Router configuration

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore, useProjectStore, storesManager } from '@/stores'
import { getSavedUser, getToken } from '@/api'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/projects',
    name: 'ProjectSelect',
    component: () => import('@/views/ProjectSelectView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/dashboard/:projectId',
    name: 'ProjectDashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: () => import('@/views/KanbanView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/kanban/:projectId',
    name: 'ProjectKanban',
    component: () => import('@/views/KanbanView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/list',
    name: 'List',
    component: () => import('@/views/ListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/list/:projectId',
    name: 'ProjectList',
    component: () => import('@/views/ListView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/members',
    name: 'Members',
    component: () => import('@/views/MembersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/members/:projectId',
    name: 'ProjectMembers',
    component: () => import('@/views/MembersView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/project/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetailView.vue'),
    meta: { requiresAuth: true, requiresProject: true, requiresProjectManager: true }
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('@/views/TimelineView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/timeline/:projectId',
    name: 'ProjectTimeline',
    component: () => import('@/views/TimelineView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/member-schedule',
    name: 'MemberSchedule',
    component: () => import('@/views/MemberScheduleView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/member-schedule/:projectId',
    name: 'ProjectMemberSchedule',
    component: () => import('@/views/MemberScheduleView.vue'),
    meta: { requiresAuth: true, requiresProject: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('@/views/MessageCenterView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/approvals',
    name: 'Approvals',
    component: () => import('@/views/ApprovalCenterView.vue'),
    meta: { requiresAuth: true, requiresProjectManager: true }
  },
  {
    path: '/my-approvals',
    name: 'MyApprovals',
    component: () => import('@/views/MyApprovalsView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  await storesManager.init()

  const userStore = useUserStore()
  const projectStore = useProjectStore()
  const canManageProject = userStore.isAdmin || userStore.currentUser?.role === 'pm'
  const routeProjectId = typeof to.params.projectId === 'string'
    ? to.params.projectId
    : typeof to.params.id === 'string'
      ? to.params.id
      : null

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    return '/login'
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    if (getToken() && getSavedUser()) {
      return true
    }
    return '/projects'
  }

  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return '/'
  }

  if (to.meta.requiresProject && routeProjectId && projectStore.currentProjectId !== routeProjectId) {
    projectStore.setCurrentProject(routeProjectId)
    if (to.meta.requiresProjectManager && !canManageProject) {
      return `/kanban/${routeProjectId}`
    }
    return true
  }

  if (to.meta.requiresProjectManager && !canManageProject) {
    const redirectProjectId = routeProjectId || projectStore.currentProjectId
    return redirectProjectId ? `/kanban/${redirectProjectId}` : '/projects'
  }

  if (to.meta.requiresProject && !projectStore.currentProjectId) {
    return '/projects'
  }

  return true
})

export default router
