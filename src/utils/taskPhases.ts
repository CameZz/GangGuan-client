import type { ProjectPhaseTemplate, Task, TaskPhase } from '@/types'
import { TASK_STAGE_LABELS, TASK_STAGES, TaskPhaseStatus, TaskStage, TaskStatus } from '@/types'

const taskStageValues = new Set<string>(Object.keys(TASK_STAGE_LABELS))

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
  if (progress >= 100) return TaskPhaseStatus.Done
  if (progress > 0) return TaskPhaseStatus.InProgress
  return TaskPhaseStatus.Pending
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
    status: TaskPhaseStatus.Pending,
    startTime: null,
    endTime: null
  }
}

export function createLegacyTaskPhase(
  stage: TaskStage,
  assigneeId: string | null,
  status: TaskStatus
): TaskPhase {
  const progress = status === TaskStatus.Done ? 100 : status === TaskStatus.InProgress ? 50 : 0
  return {
    id: `legacy-${stage}`,
    templateId: stage,
    name: TASK_STAGE_LABELS[stage] || stage,
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

export function deriveStageFromPhase(phase: TaskPhase | null, fallback: TaskStage = TaskStage.Filed): TaskStage {
  if (!phase) return TaskStage.Completed
  if (taskStageValues.has(phase.templateId)) return phase.templateId as TaskStage
  return fallback
}

export function deriveStatusFromPhases(phases: TaskPhase[], fallback: TaskStatus): TaskStatus {
  if (fallback === TaskStatus.Abandoned) return TaskStatus.Abandoned
  if (phases.length === 0) return fallback

  const progresses = phases.map(phase => clampProgress(phase.progress))
  if (progresses.every(progress => progress === 0)) return TaskStatus.Todo
  if (progresses.every(progress => progress === 100)) return TaskStatus.Done
  return TaskStatus.InProgress
}

function appendPhaseSuffix(name: string, suffix: string): string {
  return name.endsWith(suffix) ? name : `${name}${suffix}`
}

function formatCurrentPhaseLabel(phase: TaskPhase): string {
  if (phase.progress <= 0) {
    return phase.name.startsWith('待') ? phase.name : `待${phase.name}`
  }
  if (phase.progress >= 100) {
    return appendPhaseSuffix(phase.name, '完成')
  }
  return appendPhaseSuffix(phase.name, '中')
}

export function getTaskStageLabel(task: Pick<Task, 'phases' | 'stage' | 'status'>): string {
  const phases = normalizeTaskPhases(task.phases)
  const currentPhase = phases.find(phase => phase.progress < 100) || null
  if (currentPhase) return formatCurrentPhaseLabel(currentPhase)
  if (phases.length && phases.every(phase => phase.progress >= 100)) {
    return formatCurrentPhaseLabel(phases[phases.length - 1])
  }
  return TASK_STAGE_LABELS[task.stage] || task.stage
}

export function getTaskStageValue(task: Pick<Task, 'phases' | 'stage'>): TaskStage {
  return deriveStageFromPhase(getCurrentTaskPhase(task.phases), task.stage)
}

export function summarizeTaskPhases(phases?: TaskPhase[]): string {
  const normalized = normalizeTaskPhases(phases)
  if (normalized.length === 0) return '无阶段'
  return normalized.map(phase => `${phase.name} ${phase.progress}%`).join('，')
}
