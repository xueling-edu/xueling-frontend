import request from '@/utils/request'
import type { ApiResponse } from '@/types/auth'

export interface ContextTarget {
  wordId: string
  word: string
  meaning: string
  offsets: number[]
}

export interface ContextArticle {
  id: string
  title: string
  content: string
  topic: string | null
  targets: ContextTarget[]
  createTime: string
}

export interface ContextArticleSummary {
  id: string
  title: string
  topic: string | null
  wordCount: number
  createTime: string
}

export interface ContextAttemptResult {
  correctCount: number
  totalCount: number
}

export const generateContextArticle = (data: { requestId: string; wordIds: string[]; topic: string | null }): Promise<ApiResponse<ContextArticle>> =>
  request.post('/vocab-context/articles', data)

export const getContextArticle = (id: string): Promise<ApiResponse<ContextArticle>> =>
  request.get(`/vocab-context/articles/${encodeURIComponent(id)}`)

export const listContextArticles = (): Promise<ApiResponse<ContextArticleSummary[]>> =>
  request.get('/vocab-context/articles')

export const submitContextAttempt = (id: string, answers: string[]): Promise<ApiResponse<ContextAttemptResult>> =>
  request.post(`/vocab-context/articles/${encodeURIComponent(id)}/attempts`, { answers })
