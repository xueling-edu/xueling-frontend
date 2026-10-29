export type FeedbackCategory = 'FUNCTION_ISSUE' | 'FEATURE_IDEA' | 'EXPERIENCE' | 'OTHER' | 'TRANSLATION'
export type FeedbackStatus = 'PENDING' | 'PROCESSING' | 'REPLIED' | 'CLOSED'

export interface Feedback {
  id: string
  userId: string
  category: FeedbackCategory
  subcategory?: string
  content: string
  sourcePage?: string
  contextWord?: string
  wordId?: string
  observedContent?: string
  suggestedContent?: string
  contact?: string
  status: FeedbackStatus
  adminReply?: string
  resolution?: 'FIXED' | 'NO_CHANGE' | 'UNRESOLVED'
  revisionId?: string
  createTime: string
  updateTime: string
  repliedAt?: string
}

export interface CreateFeedback {
  requestId: string
  category: FeedbackCategory
  subcategory?: string
  content: string
  sourcePage?: string
  contextWord?: string
  wordId?: string
  observedContent?: string
  suggestedContent?: string
  contact?: string
}

export const categoryLabels: Record<FeedbackCategory, string> = {
  FUNCTION_ISSUE: '功能问题',
  FEATURE_IDEA: '功能建议',
  EXPERIENCE: '使用体验',
  OTHER: '其他想法',
  TRANSLATION: '翻译纠错',
}

export const statusLabels: Record<FeedbackStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  REPLIED: '已回复',
  CLOSED: '已关闭',
}
