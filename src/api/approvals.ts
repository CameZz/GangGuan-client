// 审批 API

import api from './index'

export const approvalApi = {
  // 提交任务申请
  create: (data: { title: string; remark: string; phaseSnapshot: { name: string; assigneeId: string | null }[]; projectId: string; planningId: string; parentRequirementId?: string | null; assignedReviewerId: string }) =>
    api.post('/approvals', data),

  // 获取审批列表
  list: (params?: { status?: string; projectId?: string }) => {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.set('status', params.status)
    if (params?.projectId && params.projectId !== 'all') query.set('projectId', params.projectId)
    const qs = query.toString()
    return api.get(`/approvals${qs ? `?${qs}` : ''}`)
  },

  // 获取单个申请详情
  getById: (id: string) =>
    api.get(`/approvals/${id}`),

  // 审批通过
  approve: (id: string) =>
    api.post(`/approvals/${id}/approve`),

  // 审批驳回
  reject: (id: string, reviewComment: string) =>
    api.post(`/approvals/${id}/reject`, { reviewComment }),

  // 取消申请
  cancel: (id: string) =>
    api.post(`/approvals/${id}/cancel`)
}
