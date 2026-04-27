<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore, useMemberStore, useTaskStore } from '@/stores'
import ProjectCard from '@/components/project/ProjectCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const router = useRouter()
const projectStore = useProjectStore()
const memberStore = useMemberStore()
const taskStore = useTaskStore()

const projects = computed(() => projectStore.projects.slice(0, 3))
const members = computed(() => memberStore.members)

const stats = computed(() => ({
  totalProjects: projectStore.projectCount,
  totalMembers: memberStore.memberCount,
  totalTasks: taskStore.taskCount,
  todoTasks: taskStore.todoTasks.length,
  inProgressTasks: taskStore.inProgressTasks.length,
  doneTasks: taskStore.doneTasks.length
}))

function goToProject(projectId: string) {
  router.push(`/kanban/${projectId}`)
}

function goToAllProjects() {
  router.push('/kanban')
}
</script>

<template>
  <div class="page dashboard">
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon projects">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalProjects }}</span>
          <span class="stat-label">项目数</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon members">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalMembers }}</span>
          <span class="stat-label">成员数</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon tasks">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalTasks }}</span>
          <span class="stat-label">任务总数</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon pending">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.todoTasks + stats.inProgressTasks }}</span>
          <span class="stat-label">进行中</span>
        </div>
      </div>
    </div>

    <!-- Progress Overview -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">任务概览</h2>
      </div>
      <div class="progress-cards">
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-label">待办</span>
            <span class="progress-count">{{ stats.todoTasks }}</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill todo"
              :style="{ width: `${stats.totalTasks ? (stats.todoTasks / stats.totalTasks) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-label">进行中</span>
            <span class="progress-count">{{ stats.inProgressTasks }}</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill progress"
              :style="{ width: `${stats.totalTasks ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
        <div class="progress-card">
          <div class="progress-header">
            <span class="progress-label">已完成</span>
            <span class="progress-count">{{ stats.doneTasks }}</span>
          </div>
          <div class="progress-bar-bg">
            <div
              class="progress-bar-fill done"
              :style="{ width: `${stats.totalTasks ? (stats.doneTasks / stats.totalTasks) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Projects Section -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">项目</h2>
        <router-link to="/kanban" class="btn btn-ghost">查看全部</router-link>
      </div>
      <div v-if="projects.length > 0" class="projects-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="goToProject(project.id)"
        />
      </div>
      <EmptyState
        v-else
        title="暂无项目"
        description="创建您的第一个项目开始使用"
        action-text="创建项目"
        @action="goToAllProjects"
      />
    </div>

    <!-- Team Members -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">团队成员</h2>
        <router-link to="/members" class="btn btn-ghost">查看全部</router-link>
      </div>
      <div class="members-grid">
        <div v-for="member in members" :key="member.id" class="member-card">
          <img :src="member.avatar" :alt="member.name" class="member-avatar" />
          <div class="member-info">
            <span class="member-name">{{ member.name }}</span>
            <span class="member-email">{{ member.email }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}

.stat-icon.projects {
  background-color: #ede9fe;
  color: #7c3aed;
}

.stat-icon.members {
  background-color: #dbeafe;
  color: #2563eb;
}

.stat-icon.tasks {
  background-color: #dcfce7;
  color: #16a34a;
}

.stat-icon.pending {
  background-color: #fef3c7;
  color: #d97706;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.progress-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.progress-card {
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.progress-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.progress-bar-bg {
  height: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progress-bar-fill.todo {
  background-color: #f59e0b;
}

.progress-bar-fill.progress {
  background-color: #3b82f6;
}

.progress-bar-fill.done {
  background-color: #22c55e;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.member-email {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
