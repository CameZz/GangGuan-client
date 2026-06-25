<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Project, ProjectPhaseTemplate } from '@/types'
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
const draggedPhaseId = ref<string | null>(null)
const dragOverPhaseId = ref<string | null>(null)
const isPhaseEditing = ref(false)
const isPhaseSaving = ref(false)
const phaseDrafts = ref<PhaseTemplateDraft[]>([])
const phaseError = ref('')
const canManageProject = computed(() => userStore.isProjectManager)

type PhaseTemplateDraft = ProjectPhaseTemplate & {
  isNew?: boolean
}

const phaseTemplates = computed(() => {
  return project.value?.phaseTemplates || []
})

const enabledPhaseCount = computed(() => {
  return phaseTemplates.value.filter(template => template.enabled).length
})

const displayedPhaseTemplates = computed<PhaseTemplateDraft[]>(() => {
  return isPhaseEditing.value ? phaseDrafts.value : clonePhaseTemplates()
})

const hasPhaseDraftChanges = computed(() => {
  if (!isPhaseEditing.value) return false
  if (phaseDrafts.value.length !== phaseTemplates.value.length) return true

  return phaseDrafts.value.some((draft, index) => {
    const original = phaseTemplates.value[index]
    if (!original || draft.isNew) return true
    return draft.id !== original.id || draft.name !== original.name || draft.enabled !== original.enabled
  })
})

const hasInvalidPhaseDraft = computed(() => {
  return phaseDrafts.value.some(template => !template.name.trim())
})

const createdDate = computed(() => {
  return project.value ? new Date(project.value.createdAt).toLocaleDateString() : '-'
})

const workdayAdjustmentCount = computed(() => {
  return (project.value?.nonWorkdays.length || 0) + (project.value?.extraWorkdays.length || 0)
})

const currentMonthKey = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const currentMonthLabel = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
})

const currentMonthWorkdayAdjustments = computed(() => {
  if (!project.value) return []

  return [
    ...(project.value.nonWorkdays || [])
      .filter(date => date.startsWith(currentMonthKey.value))
      .map(date => ({
        date,
        type: 'rest' as const,
        label: '休息',
        description: '工作日调整为休息'
      })),
    ...(project.value.extraWorkdays || [])
      .filter(date => date.startsWith(currentMonthKey.value))
      .map(date => ({
        date,
        type: 'work' as const,
        label: '上班',
        description: '休息日调整为上班'
      }))
  ].sort((a, b) => a.date.localeCompare(b.date))
})

watch(projectId, (id) => {
  projectStore.setCurrentProject(id)
  cancelPhaseEditing()
}, { immediate: true })

function openEditProjectModal() {
  if (!canManageProject.value) return
  isProjectModalOpen.value = true
}

function closeProjectModal() {
  isProjectModalOpen.value = false
}

async function handleProjectSave(projectData: Partial<Project>) {
  if (!canManageProject.value) return
  if (project.value) {
    const updated = await projectStore.updateProject(project.value.id, projectData)
    if (!updated) return
  }
  closeProjectModal()
}

async function handleProjectDelete() {
  if (!canManageProject.value) return
  if (project.value) {
    const success = await projectStore.deleteProject(project.value.id)
    if (success) {
      router.push('/kanban')
    }
  }
}

function clonePhaseTemplates(): PhaseTemplateDraft[] {
  return phaseTemplates.value.map(template => ({ ...template }))
}

function startPhaseEditing() {
  if (!canManageProject.value) return
  phaseDrafts.value = clonePhaseTemplates()
  newPhaseName.value = ''
  phaseError.value = ''
  isPhaseEditing.value = true
}

function cancelPhaseEditing() {
  isPhaseEditing.value = false
  isPhaseSaving.value = false
  phaseDrafts.value = []
  newPhaseName.value = ''
  phaseError.value = ''
  draggedPhaseId.value = null
  dragOverPhaseId.value = null
}

function addPhaseTemplate() {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value) return
  if (!project.value || !newPhaseName.value.trim()) return
  const nextOrder = phaseDrafts.value.length
  phaseDrafts.value = [
    ...phaseDrafts.value,
    {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: newPhaseName.value.trim(),
      order: nextOrder,
      enabled: true,
      isNew: true
    }
  ]
  newPhaseName.value = ''
}

function renamePhaseTemplate(templateId: string, name: string) {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value) return
  phaseDrafts.value = phaseDrafts.value.map(template => (
    template.id === templateId ? { ...template, name } : template
  ))
}

function togglePhaseTemplate(templateId: string, enabled: boolean) {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value) return
  phaseDrafts.value = phaseDrafts.value.map(template => (
    template.id === templateId ? { ...template, enabled } : template
  ))
}

function reorderPhaseDrafts(templates: PhaseTemplateDraft[]) {
  phaseDrafts.value = templates.map((template, index) => ({ ...template, order: index }))
}

function movePhaseTemplate(templateId: string, direction: 'up' | 'down') {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value) return
  const templates = [...phaseDrafts.value]
  const index = templates.findIndex(template => template.id === templateId)
  const targetIndex = direction === 'up' ? index - 1 : index + 1

  if (index < 0 || targetIndex < 0 || targetIndex >= templates.length) return

  const [template] = templates.splice(index, 1)
  templates.splice(targetIndex, 0, template)
  reorderPhaseDrafts(templates)
}

async function savePhaseTemplates() {
  if (!canManageProject.value || !project.value || !isPhaseEditing.value || isPhaseSaving.value) return
  if (hasInvalidPhaseDraft.value) {
    phaseError.value = '阶段名称不能为空'
    return
  }

  isPhaseSaving.value = true
  phaseError.value = ''

  try {
    const originalById = new Map(phaseTemplates.value.map(template => [template.id, template]))
    const createdIdMap = new Map<string, string>()

    for (const draft of phaseDrafts.value) {
      if (!draft.isNew) continue
      const created = await projectStore.addPhaseTemplate(project.value.id, draft.name.trim())
      if (!created) throw new Error('添加阶段失败')
      createdIdMap.set(draft.id, created.id)
      phaseDrafts.value = phaseDrafts.value.map(template => (
        template.id === draft.id ? { ...template, id: created.id, isNew: false } : template
      ))
      if (created.enabled !== draft.enabled) {
        const updated = await projectStore.updatePhaseTemplate(project.value.id, created.id, { enabled: draft.enabled })
        if (!updated) throw new Error('更新阶段状态失败')
      }
    }

    for (const draft of phaseDrafts.value) {
      if (draft.isNew) continue
      const original = originalById.get(draft.id)
      if (!original) continue

      const payload: Partial<ProjectPhaseTemplate> = {}
      const trimmedName = draft.name.trim()
      if (trimmedName !== original.name) payload.name = trimmedName
      if (draft.enabled !== original.enabled) payload.enabled = draft.enabled

      if (Object.keys(payload).length > 0) {
        const updated = await projectStore.updatePhaseTemplate(project.value.id, draft.id, payload)
        if (!updated) throw new Error('更新阶段失败')
      }
    }

    const templateIds = phaseDrafts.value
      .map(template => template.isNew ? createdIdMap.get(template.id) : template.id)
      .filter((id): id is string => Boolean(id))

    if (templateIds.length > 0) {
      const reordered = await projectStore.reorderPhaseTemplates(project.value.id, templateIds)
      if (!reordered) throw new Error('保存阶段顺序失败')
    }

    cancelPhaseEditing()
  } catch (error) {
    console.error('保存阶段库失败:', error)
    phaseError.value = error instanceof Error ? error.message : '保存阶段库失败'
  } finally {
    isPhaseSaving.value = false
  }
}

function handlePhaseDragStart(event: DragEvent, templateId: string) {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value) return
  draggedPhaseId.value = templateId
  event.dataTransfer?.setData('text/plain', templateId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handlePhaseDragOver(event: DragEvent, templateId: string) {
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value || !draggedPhaseId.value || draggedPhaseId.value === templateId) return
  event.preventDefault()
  dragOverPhaseId.value = templateId
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handlePhaseDragLeave(templateId: string) {
  if (dragOverPhaseId.value === templateId) {
    dragOverPhaseId.value = null
  }
}

async function handlePhaseDrop(event: DragEvent, targetTemplateId: string) {
  event.preventDefault()
  if (!canManageProject.value || !isPhaseEditing.value || isPhaseSaving.value || !project.value) return

  const sourceTemplateId = draggedPhaseId.value || event.dataTransfer?.getData('text/plain')
  draggedPhaseId.value = null
  dragOverPhaseId.value = null

  if (!sourceTemplateId || sourceTemplateId === targetTemplateId) return

  const templates = [...phaseDrafts.value]
  const sourceIndex = templates.findIndex(template => template.id === sourceTemplateId)
  const targetIndex = templates.findIndex(template => template.id === targetTemplateId)

  if (sourceIndex < 0 || targetIndex < 0) return

  const [movedTemplate] = templates.splice(sourceIndex, 1)
  templates.splice(targetIndex, 0, movedTemplate)

  reorderPhaseDrafts(templates)
}

function handlePhaseDragEnd() {
  draggedPhaseId.value = null
  dragOverPhaseId.value = null
}

function goToKanban() {
  router.push(`/kanban/${projectId.value}`)
}

function goToList() {
  router.push(`/list/${projectId.value}`)
}

function formatAdjustmentDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  })
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
          <div class="workday-adjustments">
            <div class="workday-adjustment-header">
              <span class="info-label">当月工作日调整</span>
              <span class="workday-month">{{ currentMonthLabel }} · {{ currentMonthWorkdayAdjustments.length }} 项</span>
            </div>
            <div v-if="currentMonthWorkdayAdjustments.length" class="workday-adjustment-list">
              <div
                v-for="item in currentMonthWorkdayAdjustments"
                :key="`${item.type}-${item.date}`"
                class="workday-adjustment-item"
              >
                <span class="workday-date">{{ formatAdjustmentDate(item.date) }}</span>
                <span class="workday-tag" :class="item.type">{{ item.label }}</span>
                <span class="workday-description">{{ item.description }}</span>
              </div>
            </div>
            <p v-else class="workday-empty">当月暂无工作日调整</p>
          </div>
        </section>

        <section class="section phase-section">
          <div class="section-header">
            <h2 class="section-title phase-title">
              阶段库
              <span class="phase-state" :class="{ editing: isPhaseEditing }">{{ isPhaseEditing ? '编辑中' : '只读' }}</span>
            </h2>
            <div v-if="canManageProject" class="phase-toolbar">
              <template v-if="isPhaseEditing">
                <button class="btn btn-secondary btn-sm" :disabled="isPhaseSaving" @click="cancelPhaseEditing">取消</button>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="isPhaseSaving || !hasPhaseDraftChanges || hasInvalidPhaseDraft"
                  @click="savePhaseTemplates"
                >{{ isPhaseSaving ? '保存中...' : '保存' }}</button>
              </template>
              <button v-else class="btn btn-secondary btn-sm" @click="startPhaseEditing">编辑</button>
            </div>
          </div>
          <div v-if="canManageProject && isPhaseEditing" class="phase-add">
            <input
              v-model="newPhaseName"
              type="text"
              class="input phase-input"
              placeholder="新增阶段"
              :disabled="isPhaseSaving"
              @keyup.enter="addPhaseTemplate"
            />
            <button class="btn btn-secondary btn-sm" :disabled="isPhaseSaving || !newPhaseName.trim()" @click="addPhaseTemplate">添加</button>
          </div>
          <p v-if="phaseError" class="phase-error">{{ phaseError }}</p>
          <div class="phase-library">
            <div
              v-for="(template, index) in displayedPhaseTemplates"
              :key="template.id"
              class="phase-template-row"
              :class="{
                disabled: !template.enabled,
                readonly: !canManageProject || !isPhaseEditing,
                dragging: draggedPhaseId === template.id,
                'drag-over': dragOverPhaseId === template.id && draggedPhaseId !== template.id,
                'new': template.isNew
              }"
              @dragover="handlePhaseDragOver($event, template.id)"
              @dragleave="handlePhaseDragLeave(template.id)"
              @drop="handlePhaseDrop($event, template.id)"
            >
              <div
                class="phase-order"
                :class="{ draggable: canManageProject && isPhaseEditing && !isPhaseSaving }"
                :draggable="canManageProject && isPhaseEditing && !isPhaseSaving"
                :title="canManageProject && isPhaseEditing ? '拖动调整顺序' : undefined"
                @dragstart="handlePhaseDragStart($event, template.id)"
                @dragend="handlePhaseDragEnd"
              >{{ index + 1 }}</div>
              <input
                v-if="canManageProject && isPhaseEditing"
                :value="template.name"
                class="input phase-name-input"
                :disabled="isPhaseSaving"
                @input="renamePhaseTemplate(template.id, ($event.target as HTMLInputElement).value)"
              />
              <div v-else class="phase-name-text">{{ template.name }}</div>
              <label v-if="canManageProject && isPhaseEditing" class="phase-enabled">
                <input
                  type="checkbox"
                  :checked="template.enabled"
                  :disabled="isPhaseSaving"
                  @change="togglePhaseTemplate(template.id, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ template.enabled ? '启用' : '停用' }}</span>
              </label>
              <span v-else class="phase-enabled-text">{{ template.enabled ? '启用' : '停用' }}</span>
              <div v-if="canManageProject && isPhaseEditing" class="phase-actions">
                <button class="btn btn-ghost btn-sm" :disabled="isPhaseSaving || index === 0" @click="movePhaseTemplate(template.id, 'up')">上移</button>
                <button class="btn btn-ghost btn-sm" :disabled="isPhaseSaving || index === displayedPhaseTemplates.length - 1" @click="movePhaseTemplate(template.id, 'down')">下移</button>
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

.workday-adjustments {
  margin-top: 12px;
  padding: 16px;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.workday-adjustment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.workday-month {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.workday-adjustment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workday-adjustment-item {
  display: grid;
  grid-template-columns: minmax(88px, auto) 48px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 32px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.workday-date {
  color: var(--color-text-primary);
  font-weight: 600;
}

.workday-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.workday-tag.rest {
  color: var(--color-danger);
  background-color: color-mix(in srgb, var(--color-danger) 10%, white);
}

.workday-tag.work {
  color: var(--color-success);
  background-color: color-mix(in srgb, var(--color-success) 10%, white);
}

.workday-description,
.workday-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.workday-empty {
  margin: 0;
}

.phase-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phase-state {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.phase-state.editing {
  color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 10%, white);
}

.phase-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.phase-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.phase-input {
  width: 220px;
}

.phase-error {
  margin: 0 0 12px;
  color: var(--color-danger);
  font-size: 13px;
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
  transition: border-color var(--transition-fast), background-color var(--transition-fast), opacity var(--transition-fast);
}

.phase-template-row.readonly {
  grid-template-columns: 40px minmax(0, 1fr) 120px;
}

.phase-template-row.new {
  border-style: dashed;
  border-color: var(--color-primary);
}

.phase-template-row.disabled {
  opacity: 0.62;
}

.phase-template-row.dragging {
  opacity: 0.45;
}

.phase-template-row.drag-over {
  border-color: var(--color-primary);
  background-color: var(--color-bg-secondary);
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
  user-select: none;
}

.phase-order.draggable {
  cursor: grab;
}

.phase-order.draggable:active {
  cursor: grabbing;
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
  .phase-add,
  .phase-toolbar {
    width: 100%;
    align-items: stretch;
  }

  .section-header,
  .header-actions,
  .phase-add,
  .phase-toolbar {
    flex-direction: column;
  }

  .phase-title {
    align-items: flex-start;
  }

  .workday-adjustment-header,
  .workday-adjustment-item {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .workday-adjustment-header {
    flex-direction: column;
    align-items: flex-start;
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
