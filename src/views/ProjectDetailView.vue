<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Project } from '@/types'
import { useProjectStore, useUserStore } from '@/stores'
import ProjectModal from '@/components/project/ProjectModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const userStore = useUserStore()

const projectId = computed(() => route.params.id as string)

const project = computed(() => {
  return projectStore.projects.find(p => p.id === projectId.value)
})

const isProjectModalOpen = ref(false)
const newPhaseName = ref('')
const canManageProject = computed(() => userStore.isProjectManager)

const phaseTemplates = computed(() => {
  return project.value?.phaseTemplates || []
})

const enabledPhaseCount = computed(() => {
  return phaseTemplates.value.filter(template => template.enabled).length
})

const createdDate = computed(() => {
  return project.value ? new Date(project.value.createdAt).toLocaleDateString() : '-'
})

const workdayAdjustmentCount = computed(() => {
  return (project.value?.nonWorkdays.length || 0) + (project.value?.extraWorkdays.length || 0)
})

watch(projectId, (id) => {
  projectStore.setCurrentProject(id)
}, { immediate: true })

function openEditProjectModal() {
  if (!canManageProject.value) return
  isProjectModalOpen.value = true
}

function closeProjectModal() {
  isProjectModalOpen.value = false
}

function handleProjectSave(projectData: Partial<Project>) {
  if (!canManageProject.value) return
  if (project.value) {
    projectStore.updateProject(project.value.id, projectData)
  }
  closeProjectModal()
}

function handleProjectDelete() {
  if (!canManageProject.value) return
  if (project.value) {
    projectStore.deleteProject(project.value.id)
    router.push('/kanban')
  }
}

function addPhaseTemplate() {
  if (!canManageProject.value) return
  if (!project.value || !newPhaseName.value.trim()) return
  projectStore.addPhaseTemplate(project.value.id, newPhaseName.value)
  newPhaseName.value = ''
}

function renamePhaseTemplate(templateId: string, name: string) {
  if (!canManageProject.value) return
  if (!project.value) return
  projectStore.updatePhaseTemplate(project.value.id, templateId, { name })
}

function togglePhaseTemplate(templateId: string, enabled: boolean) {
  if (!canManageProject.value) return
  if (!project.value) return
  projectStore.updatePhaseTemplate(project.value.id, templateId, { enabled })
}

function movePhaseTemplate(templateId: string, direction: 'up' | 'down') {
  if (!canManageProject.value) return
  if (!project.value) return
  projectStore.movePhaseTemplate(project.value.id, templateId, direction)
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
          <button v-if="canManageProject" class="btn btn-secondary" @click="openEditProjectModal">编辑项目</button>
          <div class="view-switcher">
            <button class="btn btn-ghost" @click="goToKanban">看板</button>
            <button class="btn btn-ghost" @click="goToList">列表</button>
          </div>
        </div>
      </div>

      <div class="project-detail-layout">
        <section class="section project-info-section">
          <div class="section-header">
            <h2 class="section-title">项目信息</h2>
          </div>
          <div class="info-grid">
            <div class="info-item info-item-wide">
              <span class="info-label">项目描述</span>
              <p class="info-value description">{{ project.description || '暂无描述' }}</p>
            </div>
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ createdDate }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">阶段总数</span>
              <span class="info-value">{{ phaseTemplates.length }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">启用阶段</span>
              <span class="info-value">{{ enabledPhaseCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">工作日调整</span>
              <span class="info-value">{{ workdayAdjustmentCount }}</span>
            </div>
          </div>
        </section>

        <section class="section phase-section">
          <div class="section-header">
            <h2 class="section-title">阶段库</h2>
            <div v-if="canManageProject" class="phase-add">
              <input
                v-model="newPhaseName"
                type="text"
                class="input phase-input"
                placeholder="新增阶段"
                @keyup.enter="addPhaseTemplate"
              />
              <button class="btn btn-secondary btn-sm" :disabled="!newPhaseName.trim()" @click="addPhaseTemplate">添加</button>
            </div>
          </div>
          <div class="phase-library">
            <div
              v-for="(template, index) in phaseTemplates"
              :key="template.id"
              class="phase-template-row"
              :class="{ disabled: !template.enabled, readonly: !canManageProject }"
            >
              <div class="phase-order">{{ index + 1 }}</div>
              <input
                v-if="canManageProject"
                :value="template.name"
                class="input phase-name-input"
                @change="renamePhaseTemplate(template.id, ($event.target as HTMLInputElement).value)"
              />
              <div v-else class="phase-name-text">{{ template.name }}</div>
              <label v-if="canManageProject" class="phase-enabled">
                <input
                  type="checkbox"
                  :checked="template.enabled"
                  @change="togglePhaseTemplate(template.id, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ template.enabled ? '启用' : '停用' }}</span>
              </label>
              <span v-else class="phase-enabled-text">{{ template.enabled ? '启用' : '停用' }}</span>
              <div v-if="canManageProject" class="phase-actions">
                <button class="btn btn-ghost btn-sm" :disabled="index === 0" @click="movePhaseTemplate(template.id, 'up')">上移</button>
                <button class="btn btn-ghost btn-sm" :disabled="index === phaseTemplates.length - 1" @click="movePhaseTemplate(template.id, 'down')">下移</button>
              </div>
            </div>
          </div>
        </section>
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
      v-if="project && canManageProject"
      :is-open="isProjectModalOpen"
      :project="project"
      @close="closeProjectModal"
      @save="handleProjectSave"
      @delete="handleProjectDelete"
    />

  </div>
</template>

<style scoped>
.project-detail {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
}

.header-content {
  flex: 1;
  min-width: 0;
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
  min-width: 0;
  overflow-wrap: anywhere;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-left: 60px;
  max-width: 960px;
  overflow-wrap: anywhere;
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

.project-detail-layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(520px, 1.28fr);
  gap: 24px;
  align-items: start;
}

.section {
  min-width: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-item {
  min-height: 86px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.info-item-wide {
  grid-column: 1 / -1;
  min-height: 148px;
}

.info-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.info-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.info-value.description {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.phase-add {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phase-input {
  width: 220px;
}

.phase-library {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-template-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 120px 152px;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-primary);
}

.phase-template-row.readonly {
  grid-template-columns: 40px minmax(0, 1fr) 120px;
}

.phase-template-row.disabled {
  opacity: 0.62;
}

.phase-order {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.phase-name-input {
  min-width: 0;
}

.phase-name-text {
  min-width: 0;
  font-size: 14px;
  color: var(--color-text-primary);
  overflow-wrap: anywhere;
}

.phase-enabled {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.phase-enabled input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.phase-enabled-text {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.phase-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .project-detail-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-header {
    flex-direction: column;
  }

  .page-subtitle {
    margin-left: 0;
  }

  .header-actions,
  .section-header,
  .phase-add {
    width: 100%;
    align-items: stretch;
  }

  .header-actions,
  .phase-add {
    flex-direction: column;
  }

  .view-switcher {
    width: 100%;
  }

  .view-switcher .btn {
    flex: 1;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .phase-input {
    width: 100%;
  }

  .phase-template-row,
  .phase-template-row.readonly {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .phase-enabled,
  .phase-enabled-text,
  .phase-actions {
    grid-column: 2;
  }

  .phase-actions {
    justify-content: flex-start;
  }
}
</style>
