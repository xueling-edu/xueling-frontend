/**
 * 翻译功能相关的 TypeScript 类型定义
 */

// 翻译结果
export interface TranslateResult {
  id: string
  word: string              // 原始单词
  phonetic?: string         // 音标
  translations: Translation[] // 翻译列表
  source?: 'ECDICT' | 'AI' | 'AI_ENRICHED' | 'MANUAL'
  examples?: Example[]      // 例句
  etymology?: string        // 词源
  inWordBook?: boolean      // 是否已在单词本中
  wordBookId?: string       // 所在单词本ID（如果已收藏）
}

// 单个翻译
export interface Translation {
  pos: string              // 词性 (n. v. adj. 等)
  meanings: string[]       // 释义列表
}

// 例句
export interface Example {
  en: string              // 英文例句
  zh: string              // 中文翻译
}

// 翻译历史记录
export interface TranslateHistory {
  id: string
  word: string
  result: TranslateResult
  timestamp: number
}

// 添加到单词本的参数
export interface AddToBookParams {
  wordBookId: string
  word: string
  meaning: string
  phonetic: string
}
