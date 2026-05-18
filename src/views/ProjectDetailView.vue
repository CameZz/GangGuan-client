<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Project, Task } from '@/types'
import { useProjectStore, useTaskStore, useMemberStore, useUserStore } from '@/stores'
import ProjectModal from '@/components/project/ProjectModal.vue'
import TaskCard from '@/components/task/TaskCard.vue'
import TaskModalComponent from '@/components/task/TaskModal.vue'
import MemberAvatar from '@/components/member/MemberAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const memberStore = useMemberStore()
const userStore = useUserStore()

const projectId = computed(() => route.params.id as string)

const project = computed(() => {
  return projectStore.projects.find(p => p.id === projectId.value)
})

const projectTasks = computed(() => {
  return taskStore.tasks.filter(t => t.projectId === projectId.value)
})

const tasksByStatus = computed(() => ({
  todo: projectTasks.value.filter(t => t.status === 'todo'),
  inProgress: projectTasks.value.filter(t => t.status === 'in-progress'),
  done: projectTasks.value.filter(t => t.status === 'done'),
  abandoned: projectTasks.value.filter(t => t.status === 'abandoned')
}))

const assignedMemberIds = computed(() => {
  const ids = new Set<string>()
  projectTasks.value.forEach(t => {
    if (t.assigneeId) ids.add(t.assigneeId)
  })
  return Array.from(ids)
})

const assignedMembers = computed(() => {
  return assignedMemberIds.value.map(id => memberStore.getMemberById(id)).filter(Boolean)
})

const stats = computed(() => ({
  total: projectTasks.value.length,
  todo: tasksByStatus.value.todo.length,
  inProgress: tasksByStatus.value.inProgress.length,
  done: tasksByStatus.value.done.length,
  abandoned: tasksByStatus.value.abandoned.length,
  completion: projectTasks.value.length > 0
    ? Math.round((tasksByStatus.value.done.length / projectTasks.value.length) * 100)
    : 0
}))

const isProjectModalOpen = ref(false)
const isTaskModalOpen = ref(false)
const selectedTask = ref<Task | null>(null)

watch(projectId, (id) => {
  projectStore.setCurrentProject(id)
}, { immediate: true })

function openEditProjectModal() {
  isProjectModalOpen.value = true
}

function openNewTaskModal() {
  selectedTask.value = null
  isTaskModalOpen.value = true
}

function openEditTaskModal(task: Task) {
  selectedTask.value = task
  isTaskModalOpen.value = true
}

function closeProjectModal() {
  isProjectModalOpen.value = false
}

function closeTaskModal() {
  isTaskModalOpen.value = false
  selectedTask.value = null
}

function handleProjectSave(projectData: Partial<Project>) {
  if (project.value) {
    projectStore.updateProject(project.value.id, projectData)
  }
  closeProjectModal()
}

function handleProjectDelete() {
  if (project.value) {
    projectStore.deleteProject(project.value.id)
    router.push('/kanban')
  }
}

function handleTaskSave(taskData: Partial<Task>) {
  if (selectedTask.value) {
    taskStore.updateTask(selectedTask.value.id, taskData, userStore.currentUser?.id)
  } else {
    taskStore.createTask({
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate || null,
      projectId: projectId.value,
      assigneeId: taskData.assigneeId || null,
      stage: taskData.stage || 'filed',
      planningId: taskData.planningId || null,
      participants: taskData.participants || [],
      references: taskData.references || [],
      comments: taskData.comments || []
    })
  }
  closeTaskModal()
}

function handleTaskDelete(taskId: string) {
  taskStore.deleteTask(taskId)
  closeTaskModal()
}

function goToKanban() {
  router.push(`/kanban/${projectId.value}`)
}

function goToList() {
  router.push(`/list/${projectId.value}`)
}
</script>

<template>
  <div class="page project-detail">
    <template v-if="project">
      <div class="page-header">
        <div class="header-content">
          <div class="project-title-row">
            <div class="project-icon">{{ project.name.charAt(0).toUpperCase() }}</div>
            <h1 class="page-title">{{ project.name }}</h1>
          </div>
          <p class="page-subtitle">{{ project.description }}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="openEditProjectModal">编辑项目</button>
          <div class="view-switcher">
            <button class="btn btn-ghost" @click="goToKanban">看板</button>
            <button class="btn btn-ghost" @click="goToList">列表</button>
          </div>
        </div>
      </div>

      <!-- Project Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">任务总数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value todo">{{ stats.todo }}</span>
          <span class="stat-label">待办</span>
        </div>
        <div class="stat-card">
          <span class="stat-value progress">{{ stats.inProgress }}</span>
          <span class="stat-label">进行中</span>
        </div>
        <div class="stat-card">
          <span class="stat-value done">{{ stats.done }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.completion }}%</span>
          <span class="stat-label">完成度</span>
        </div>
      </div>

      <!-- Team Members -->
      <div class="section">
        <h2 class="section-title">团队 ({{ assignedMembers.length }})</h2>
        <div class="team-list">
          <div v-for="member in assignedMembers" :key="member!.id" class="team-member">
            <MemberAvatar :member="member" size="md" show-name />
          </div>
          <div v-if="assignedMembers.length === 0" class="no-members">
            暂无成员分配
          </div>
        </div>
      </div>

      <!-- Tasks Preview -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">最近任务</h2>
          <button class="btn btn-primary btn-sm" @click="openNewTaskModal">添加任务</button>
        </div>
        <div class="tasks-grid">
          <TaskCard
            v-for="task in projectTasks.slice(0, 6)"
            :key="task.id"
            :task="task"
            @click="openEditTaskModal(task)"
          />
        </div>
        <div v-if="projectTasks.length === 0" class="empty-tasks">
          <EmptyState
            title="暂无任务"
            description="为该项目创建您的第一个任务"
            action-text="创建任务"
            @action="openNewTaskModal"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <EmptyState
        title="项目未找到"
        description="您查找的项目不存在"
        action-text="返回仪表盘"
        @action="() => router.push('/')"
      />
    </template>

    <ProjectModal
      v-if="project"
      :is-open="isProjectModalOpen"
      :project="project"
      @close="closeProjectModal"
      @save="handleProjectSave"
      @delete="handleProjectDelete"
    />

    <TaskModalComponent
      :is-open="isTaskModalOpen"
      :task="selectedTask"
      @close="closeTaskModal"
      @save="handleTaskSave"
      @delete="handleTaskDelete"
    />
  </div>
</template>

<style scoped>
.project-detail {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.project-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  font-size: 20px;
  font-weight: 700;
  border-radius: var(--radius-md);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-left: 60px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-switcher {
  display: flex;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  padding: 4px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value.todo {
  color: #d97706;
}

.stat-value.progress {
  color: #2563eb;
}

.stat-value.done {
  color: #16a34a;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.team-member {
  padding: 8px 12px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
}

.no-members {
  color: var(--color-text-muted);
  font-size: 14px;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.empty-tasks {
  padding: 24px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
