/**
 * 单词本相关的 TypeScript 类型定义
 *
 * 说明：后端所有主键（雪花算法生成的 19 位 Long）统一以字符串返回，
 * 前端一律使用 string，避免超出 JS 安全整数范围导致精度丢失。
 */

// 单词本信息
export interface WordBook {
  id: string           // 单词本ID
  name: string         // 单词本名称
  wordCount?: number   // 单词数量
  createTime?: string  // 创建时间
  updateTime?: string  // 更新时间
}

// 单词本 VO（用于列表展示）
export interface WordBookVo {
  id: string           // 单词本ID
  name: string         // 单词本名称
  wordCount: number    // 单词总数
  learningCoverage: number // 已学词数占比（0-100）
  mastery?: number     // 旧接口兼容字段
  color?: string       // 封面背景色
  icon?: string        // 封面图标
  learnedCount?: number
  studyEnabled?: boolean
  bookType?: 'SYSTEM' | 'USER'
}

// 创建单词本 DTO
export interface CreateWordBookDTO {
  name: string         // 单词本名称
  color: string        // 封面背景色
  icon: string         // 封面图标
}

// 单词字典（用于智能匹配）
export interface WordDictionary {
  id: string           // 主键ID
  word: string         // 单词
  meaning: string      // 释义
  translations?: { pos: string; meanings: string[] }[]
  source?: 'ECDICT' | 'AI' | 'AI_ENRICHED'
  phonetic: string     // 音标
  example?: string     // 英文例句
  exampleTranslation?: string // 例句中文翻译
  inWordBook?: boolean // 是否已在单词本中
  wordBookId?: string  // 单词本ID
}

// 单词 VO
export interface WordVO {
  id: string
  word: string
  meaning: string
  phonetic: string
  example?: string
  exampleTranslation?: string
  imageUrl?: string
  createTime?: string
}

// 单词本详情 VO
export interface WordBookDetailVO {
  id: string
  name: string
  wordCount: number
  learningCoverage: number // 已学词数占比（0-100）
  mastery?: number     // 旧接口兼容字段
  wordList: WordVO[]
  learnedCount?: number
  studyEnabled?: boolean
  bookType?: 'SYSTEM' | 'USER'
}

export interface StudyQueueCard {
  wordId: string
  word: string
  phonetic?: string
  meaning: string
  example?: string
  exampleTranslation?: string
  imageUrl?: string
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'
  dueAt?: string
  version: number
  newCard: boolean
}

export interface TodayStudy {
  dueCount: number
  newRemaining: number
  todayReviewed: number
  todayNew: number
  checkedIn: boolean
  nextDueAt?: string
  cards: StudyQueueCard[]
}

export interface StudyCalendarDay {
  date: string
  checkedIn: boolean
  reviewCount: number
  newWords: number
  studyTimeMs: number
}

export interface StudyCalendar {
  month: string
  today: string
  checkedInToday: boolean
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  days: StudyCalendarDay[]
}

export interface StudySettings {
  timeZone: string
  dailyNewLimit: number
  desiredRetention: number
}

export interface StudyStats {
  todayReviewed: number
  todayNew: number
  learnedWords: number
  dueCount: number
  dueRecallAttempts: number
  dueRecallRate: number | null
}

export interface StudyDayStats {
  date: string
  reviewCount: number
  newWords: number
  studyTimeMs: number
  dueRecallAttempts: number
  dueRecallRate: number | null
  goodOrEasyRate: number | null
  dueBacklog: number
}

export type FamiliarityStage = 'ALL' | 'LEARNING' | 'CONSOLIDATING' | 'STABLE'

export interface StudyFamiliarityWord {
  wordId: string
  word: string
  meaning: string
  stage: Exclude<FamiliarityStage, 'ALL'>
  inStudyPlan: boolean
  due: boolean
  dueAt: string
  lapseCount: number
  lastRating: number | null
  stabilityDays: number | null
}

export interface StudyFamiliarity {
  learnedCount: number
  learningCount: number
  consolidatingCount: number
  stableCount: number
  dueCount: number
  wordCount: number
  page: number
  pageSize: number
  words: StudyFamiliarityWord[]
  attentionWords: StudyFamiliarityWord[]
}

export interface StudyReviewCount {
  once: number
  twice: number
  threeToFive: number
  sixOrMore: number
}

export interface StudyReviewResult {
  wordId: string
  state: string
  dueAt: string
  version: number
}

export interface SubmitStudyReview {
  wordId: string
  rating: 1 | 2 | 3 | 4
  expectedVersion: number
  requestId: string
  elapsedMs: number
}

// 添加单词到单词本 DTO
export interface AddWordsToWordBookDTO {
  wordBookId: string
  wordIds: string[]
}

// 移除单词从单词本 DTO
export interface RemoveWordsFromWordBookDTO {
  wordBookId: string
  wordIds: string[]
}

// 单词族节点 VO
export interface WordFamilyNodeVO {
  name: string
  type: 'root' | 'pos' | 'word' | 'meaning'
  posCode?: string | null
  children?: WordFamilyNodeVO[]
}
