import type { ProjectPhaseTemplate, Task, TaskPhase, TaskPhaseStatus, TaskStage, TaskStatus } from '@/types'
import { TASK_STAGES } from '@/types'

const taskStageValues = new Set<string>(TASK_STAGES.map(stage => stage.value))

export function createDefaultPhaseTemplates(): ProjectPhaseTemplate[] {
  return TASK_STAGES.map((stage, index) => ({
    id: stage.value,
    name: stage.label,
    order: index,
    enabled: true
  }))
}

export function normalizePhaseTemplates(templates?: ProjectPhaseTemplate[]): ProjectPhaseTemplate[] {
  const source = templates && templates.length > 0 ? templates : createDefaultPhaseTemplates()
  return source
    .map((template, index) => ({
      id: template.id || `phase-template-${index + 1}`,
      name: template.name || `阶段 ${index + 1}`,
      order: Number.isFinite(template.order) ? template.order : index,
      enabled: template.enabled !== false
    }))
    .sort((a, b) => a.order - b.order)
    .map((template, index) => ({ ...template, order: index }))
}

export function clampProgress(progress: number | undefined): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(100, Math.max(0, Math.round(progress || 0)))
}

export function getPhaseStatus(progress: number): TaskPhaseStatus {
  if (progress >= 100) return 'done'
  if (progress > 0) return 'in-progress'
  return 'pending'
}

export function sortTaskPhases(phases: TaskPhase[]): TaskPhase[] {
  return [...phases].sort((a, b) => a.order - b.order)
}

export function normalizeTaskPhases(phases?: TaskPhase[]): TaskPhase[] {
  if (!phases || phases.length === 0) return []
  return sortTaskPhases(phases)
    .map((phase, index) => {
      const progress = clampProgress(phase.progress)
      return {
        id: phase.id || `phase-${index + 1}`,
        templateId: phase.templateId || phase.id || `phase-template-${index + 1}`,
        name: phase.name || `阶段 ${index + 1}`,
        order: Number.isFinite(phase.order) ? phase.order : index,
        assigneeId: phase.assigneeId || null,
        progress,
        status: getPhaseStatus(progress),
        startTime: phase.startTime || null,
        endTime: phase.endTime || null
      }
    })
    .sort((a, b) => a.order - b.order)
    .map((phase, index) => ({ ...phase, order: index }))
}

export function createTaskPhaseFromTemplate(
  template: ProjectPhaseTemplate,
  order: number,
  assigneeId: string | null = null
): TaskPhase {
  return {
    id: `${template.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    templateId: template.id,
    name: template.name,
    order,
    assigneeId,
    progress: 0,
    status: 'pending',
    startTime: null,
    endTime: null
  }
}

export function createLegacyTaskPhase(
  stage: TaskStage,
  assigneeId: string | null,
  status: TaskStatus
): TaskPhase {
  const stageDef = TASK_STAGES.find(item => item.value === stage)
  const progress = status === 'done' ? 100 : status === 'in-progress' ? 50 : 0
  return {
    id: `legacy-${stage}`,
    templateId: stage,
    name: stageDef?.label || stage,
    order: 0,
    assigneeId,
    progress,
    status: getPhaseStatus(progress),
    startTime: null,
    endTime: null
  }
}

export function getCurrentTaskPhase(phases?: TaskPhase[]): TaskPhase | null {
  const normalized = normalizeTaskPhases(phases)
  if (normalized.length === 0) return null
  return normalized.find(phase => phase.progress < 100) || null
}

export function getTaskPhaseProgress(phases?: TaskPhase[]): { done: number; total: number; percent: number } {
  const normalized = normalizeTaskPhases(phases)
  const total = normalized.length
  if (total === 0) return { done: 0, total: 0, percent: 0 }
  const done = normalized.filter(phase => phase.progress >= 100).length
  const percent = Math.round(normalized.reduce((sum, phase) => sum + phase.progress, 0) / total)
  return { done, total, percent }
}

export function deriveStageFromPhase(phase: TaskPhase | null, fallback: TaskStage = 'filed'): TaskStage {
  if (!phase) return 'completed'
  if (taskStageValues.has(phase.templateId)) return phase.templateId as TaskStage
  return fallback
}

export function deriveStatusFromPhases(phases: TaskPhase[], fallback: TaskStatus): TaskStatus {
  if (fallback === 'abandoned') return 'abandoned'
  if (phases.length === 0) return fallback
  if (phases.every(phase => phase.progress >= 100)) return 'done'
  if (phases.some(phase => phase.progress > 0)) return 'in-progress'
  return 'todo'
}

export function getTaskStageLabel(task: Pick<Task, 'phases' | 'stage' | 'status'>): string {
  const currentPhase = getCurrentTaskPhase(task.phases)
  if (currentPhase) return currentPhase.name
  if (task.phases?.length && task.phases.every(phase => phase.progress >= 100)) return '完成'
  const stage = TASK_STAGES.find(item => item.value === task.stage)
  return stage?.label || task.stage
}

export function getTaskStageValue(task: Pick<Task, 'phases' | 'stage'>): TaskStage {
  return deriveStageFromPhase(getCurrentTaskPhase(task.phases), task.stage)
}

export function summarizeTaskPhases(phases?: TaskPhase[]): string {
  const normalized = normalizeTaskPhases(phases)
  if (normalized.length === 0) return '无阶段'
  return normalized.map(phase => `${phase.name} ${phase.progress}%`).join('，')
}
