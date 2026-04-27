// Vue Router configuration

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/kanban',
    name: 'Kanban',
    component: () => import('@/views/KanbanView.vue')
  },
  {
    path: '/kanban/:projectId',
    name: 'ProjectKanban',
    component: () => import('@/views/KanbanView.vue')
  },
  {
    path: '/list',
    name: 'List',
    component: () => import('@/views/ListView.vue')
  },
  {
    path: '/list/:projectId',
    name: 'ProjectList',
    component: () => import('@/views/ListView.vue')
  },
  {
    path: '/members',
    name: 'Members',
    component: () => import('@/views/MembersView.vue')
  },
  {
    path: '/project/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetailView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
