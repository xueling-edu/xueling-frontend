/**
 * 单词本 API 服务层
 * 提供单词本相关的 API 接口
 */

import request from '@/utils/request'
import type { ApiResponse } from '@/types/auth'
import type { CreateWordBookDTO, WordDictionary, WordVO, WordBookVo, WordBookDetailVO, AddWordsToWordBookDTO, RemoveWordsFromWordBookDTO, WordFamilyNodeVO, TodayStudy, StudySettings, StudyStats, StudyDayStats, StudyCalendar, StudyReviewCount, StudyReviewResult, SubmitStudyReview, StudyFamiliarity, FamiliarityStage, StudyFollowup } from '@/features/vocab/types'

export const getTodayStudy = (): Promise<ApiResponse<TodayStudy>> => request.get('/study/today')
export const getStudyFollowups = (): Promise<ApiResponse<StudyFollowup[]>> => request.get('/study/followups')
export const getStudyFollowupSummary = (): Promise<ApiResponse<{ passed: number; failed: number; skipped: number }>> =>
  request.get('/study/followups/summary')
export const recordStudyAction = (requestId: string, action: 'teaching' | 'revisit', result: string): Promise<ApiResponse<string>> =>
  request.post(`/study/followups/${encodeURIComponent(requestId)}/actions`, { action, result })
export const submitStudyReview = (data: SubmitStudyReview): Promise<ApiResponse<StudyReviewResult>> =>
  request.post('/study/reviews', data)
export const getStudyStats = (): Promise<ApiResponse<StudyStats>> => request.get('/study/stats')
export const getStudyHistory = (days: 7 | 30): Promise<ApiResponse<StudyDayStats[]>> =>
  request.get('/study/history', { params: { days } })
export const getStudyCalendar = (month?: string): Promise<ApiResponse<StudyCalendar>> =>
  request.get('/study/calendar', { params: month ? { month } : {} })
export const getStudyReviewCounts = (): Promise<ApiResponse<StudyReviewCount>> =>
  request.get('/study/review-counts')
export const getStudyFamiliarity = (params: { bookId?: string; stage: FamiliarityStage; page: number }): Promise<ApiResponse<StudyFamiliarity>> =>
  request.get('/study/familiarity', { params })
export const getStudySettings = (): Promise<ApiResponse<StudySettings>> => request.get('/study/settings')
export const updateStudySettings = (data: StudySettings): Promise<ApiResponse<StudySettings>> =>
  request.put('/study/settings', data)
export const setStudyBookEnabled = (bookId: string, enabled: boolean): Promise<ApiResponse<string>> =>
  request.put(`/study/books/${bookId}`, { enabled })

/**
 * 创建一个单词本
 * @param data 创建单词本数据对象 (DTO)
 * @returns Promise<ApiResponse<string>> 返回创建结果
 */
export const createWordBook = (data: CreateWordBookDTO): Promise<ApiResponse<string>> => {
  return request.post('/wordbooks', data)
}

/**
 * 添加单词到单词本
 * @param data 添加单词数据对象
 * @returns Promise<ApiResponse<string>> 返回结果
 */
export const addWordsToBook = (data: AddWordsToWordBookDTO): Promise<ApiResponse<string>> => {
  return request.post('/wordbooks/word', data)
}

/**
 * 从单词本中移除单词
 * @param data 移除单词数据对象
 * @returns Promise<ApiResponse<string>> 返回结果
 */
export const removeWordsFromBook = (data: RemoveWordsFromWordBookDTO): Promise<ApiResponse<string>> => {
  return request.delete(`/wordbooks/word`, {
    data: data
  })
}

/**
 * 获取单词本详情
 * @param id 单词本ID
 * @returns Promise<ApiResponse<WordBookDetailVO>> 返回单词本详情
 */
export const getWordBookDetail = (id: string | number): Promise<ApiResponse<WordBookDetailVO>> => {
  return request.get(`/wordbooks/${id}`)
}

/**
 * 获取单词本列表
 * @returns Promise<ApiResponse<WordBookVo[]>> 返回单词本列表
 */
export const getWordBooks = (): Promise<ApiResponse<WordBookVo[]>> => {
  return request.get('/wordbooks/all')
}

/**
 * 智能匹配单词
 * @param words 单词列表（逗号分隔的字符串）
 * @returns Promise<ApiResponse<WordDictionary[]>> 返回匹配的单词列表
 */
export const matchWords = (words: string): Promise<ApiResponse<WordDictionary[]>> => {
  return request.post('/wordbooks/match', null, {
    params: { words }
  })
}

/**
 * 根据ID列表获取单词详情
 * @param ids ID列表（逗号分隔）
 * @returns Promise<ApiResponse<WordVO[]>> 后端返回的是 WordVO 列表
 */
export const getWordsByIds = (ids: string): Promise<ApiResponse<WordVO[]>> => {
  // 将逗号分隔的字符串转换为数组
  const wordIds = ids.split(',')
  return request.post('/word-review/word-detail', {
     wordIds
  })
}

/**
 * 获取单词的单词族（各种词性）
 * @param word 单词
 * @return 单词族
 */
export const getWordFamily = (word: string): Promise<ApiResponse<WordFamilyNodeVO>> => {
    return request.get('/word-review/family', { params: { word } })
}
