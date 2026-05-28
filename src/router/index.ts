// Vue Router configuration

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore, useProjectStore } from '@/stores'

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
    meta: { requiresAuth: true, requiresProject: true }
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
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const projectStore = useProjectStore()

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
  } else if (to.meta.requiresProject && !projectStore.currentProjectId) {
    next('/projects')
  } else {
    next()
  }
})

export default router
