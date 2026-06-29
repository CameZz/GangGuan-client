// Approval store - manages approval request state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskApprovalRequest, ApprovalStatus, Notification } from '@/types'
import { approvalApi } from '@/api/approvals'
import { unwrapApiData } from '@/api'
import { wsService } from '@/utils/websocket'

type ApprovalListScope = 'review' | 'submitted'

export const useApprovalStore = defineStore('approval', () => {
  const approvals = ref<TaskApprovalRequest[]>([])
  const isLoading = ref(false)
  const statusFilter = ref<ApprovalStatus | 'all'>('pending')
  const projectFilter = ref<string | 'all'>('all')
  const scopeFilter = ref<ApprovalListScope>('review')
  const pendingReviewCount = ref(0)

  const pendingApprovals = computed(() =>
    approvals.value.filter(a => a.status === 'pending')
  )

  const approvedApprovals = computed(() =>
    approvals.value.filter(a => a.status === 'approved')
  )

  const rejectedApprovals = computed(() =>
    approvals.value.filter(a => a.status === 'rejected')
  )

  const pendingCount = computed(() => pendingReviewCount.value)

  async function fetchApprovals(params?: { status?: ApprovalStatus | 'all'; projectId?: string | 'all'; scope?: ApprovalListScope }): Promise<void> {
    isLoading.value = true
    try {
      if (params?.status !== undefined) statusFilter.value = params.status
      if (params?.projectId !== undefined) projectFilter.value = params.projectId
      if (params?.scope !== undefined) scopeFilter.value = params.scope

      const data = unwrapApiData<{ approvals: TaskApprovalRequest[] }>(
        await approvalApi.list({
          status: statusFilter.value,
          projectId: projectFilter.value,
          scope: scopeFilter.value
        })
      )
      if (data?.approvals) {
        approvals.value = data.approvals
        if (scopeFilter.value === 'review' && statusFilter.value === 'pending' && projectFilter.value === 'all') {
          pendingReviewCount.value = data.approvals.length
        }
      }
    } catch (error) {
      console.error('获取审批列表失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPendingReviewCount(): Promise<void> {
    try {
      const data = unwrapApiData<{ approvals: TaskApprovalRequest[] }>(
        await approvalApi.list({ status: 'pending', scope: 'review' })
      )
      pendingReviewCount.value = data?.approvals?.length || 0
    } catch (error) {
      console.error('获取待审批数量失败:', error)
    }
  }

  async function submitRequest(data: {
    title: string
    remark: string
    phaseSnapshot: { name: string; assigneeId: string | null }[]
    projectId: string
    planningId: string
    parentRequirementId?: string | null
    assignedReviewerId: string
  }): Promise<TaskApprovalRequest | null> {
    try {
      const result = unwrapApiData<{ approval: TaskApprovalRequest }>(
        await approvalApi.create(data) 
      )
      if (result?.approval) {
        // 如果当前筛选条件包含该状态，添加到列表
        if (
          scopeFilter.value === 'submitted' &&
          (statusFilter.value === 'all' || statusFilter.value === 'pending') &&
          (projectFilter.value === 'all' || projectFilter.value === result.approval.projectId)
        ) {
          approvals.value.unshift(result.approval)
        }
        return result.approval
      }
      return null
    } catch (error) {
      console.error('提交任务申请失败:', error)
      throw error
    }
  }

  async function approveRequest(id: string): Promise<TaskApprovalRequest | null> {
    try {
      const result = unwrapApiData<{ approval: TaskApprovalRequest }>(
        await approvalApi.approve(id) 
      )
      if (result?.approval) {
        const index = approvals.value.findIndex(a => a.id === id)
        if (index !== -1) {
          approvals.value[index] = result.approval
        }
        await fetchPendingReviewCount()
        return result.approval
      }
      return null
    } catch (error) {
      console.error('审批通过失败:', error)
      throw error
    }
  }

  async function rejectRequest(id: string, reviewComment: string): Promise<TaskApprovalRequest | null> {
    try {
      const result = unwrapApiData<{ approval: TaskApprovalRequest }>(
        await approvalApi.reject(id, reviewComment)
      )
      if (result?.approval) {
        const index = approvals.value.findIndex(a => a.id === id)
        if (index !== -1) {
          approvals.value[index] = result.approval
        }
        await fetchPendingReviewCount()
        return result.approval
      }
      return null
    } catch (error) {
      console.error('审批驳回失败:', error)
      throw error
    }
  }

  async function cancelAction(id: string): Promise<TaskApprovalRequest | null> {
    try {
      const result = unwrapApiData<{ approval: TaskApprovalRequest }>(
        await approvalApi.cancel(id)
      )
      if (result?.approval) {
        const index = approvals.value.findIndex(a => a.id === id)
        if (index !== -1) {
          approvals.value[index] = result.approval
        }
        return result.approval
      }
      return null
    } catch (error) {
      console.error('取消申请失败:', error)
      throw error
    }
  }

  function clearData(): void {
    approvals.value = []
    statusFilter.value = 'pending'
    projectFilter.value = 'all'
    scopeFilter.value = 'review'
    pendingReviewCount.value = 0
  }

  // 收到新审批通知时，自动刷新待审数量
  wsService.on('notification:create', (notification: Notification) => {
    if (notification.type === 'approval_submitted') {
      fetchPendingReviewCount()
    }
  })

  return {
    approvals,
    isLoading,
    statusFilter,
    projectFilter,
    scopeFilter,
    pendingApprovals,
    approvedApprovals,
    rejectedApprovals,
    pendingCount,
    fetchApprovals,
    fetchPendingReviewCount,
    submitRequest,
    approveRequest,
    rejectRequest,
    cancelAction,
    clearData
  }
})
