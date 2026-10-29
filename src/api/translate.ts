/**
 * 翻译 API 服务层
 * 提供单词翻译相关的 API 接口
 */

import request from '@/utils/request'
import type { ApiResponse } from '@/types/auth'
import type { TranslateResult, Translation } from '@/types/translate'
import type { WordDictionary } from '@/features/vocab/types'

/**
 * 翻译单词
 * @param text 要翻译的单词
 * @returns Promise<ApiResponse<TranslateResult>> 返回翻译结果
 */
export const translateText = async (text: string): Promise<ApiResponse<TranslateResult | null>> => {
  try {
    const response = await request.get<any, ApiResponse<WordDictionary>>('/dictionary', {
      params: { word: text.trim() }
    })
    
    if (response.code === 0 && response.data) {
      const wordData = response.data
      
      // 解析释义，提取词性和含义
      const translations: Translation[] = wordData.translations ?? parseTranslations(wordData.meaning)
      
      // 处理例句
      const examples = []
      if (wordData.example && wordData.exampleTranslation) {
        examples.push({
          en: wordData.example,
          zh: wordData.exampleTranslation
        })
      }
      
      // 将 WordDictionary 转换为 TranslateResult 格式
      const result: TranslateResult = {
        id: wordData.id,
        word: wordData.word,
        phonetic: wordData.phonetic,
        translations,
        source: wordData.source,
        examples,
        inWordBook: wordData.inWordBook,
        wordBookId: wordData.wordBookId
      }
      
      return {
        code: 0,
        msg: '翻译成功',
        data: result
      }
    }
    
    return {
      code: response.code,
      msg: response.msg || '未找到该单词',
      data: null
    }
  } catch (error: any) {
    console.error('翻译API错误:', error)
    return {
      code: -1,
      msg: error.message || '翻译失败',
      data: null
    }
  }
}

/**
 * 解析释义字符串，提取词性和含义
 * 支持复杂格式：
 * - "n. 旗帜；标记；信号；vt. 标记；标志；vi. 下垂；变弱；疲惫"
 */
function parseTranslations(meaning: string): Translation[] {
  if (!meaning) {
    return []
  }

  // 1. 尝试直接按分号分割用于简单情况检查 (fallback)
  // 但主要逻辑是先按词性分割
  
  // 使用捕获组分割字符串，这样词性也会保留在数组中
  // 匹配 1-5 个字母加点号的情况，如 n. vt. adj. 
  const parts = meaning.split(/([a-z]{1,5}\.)/i)
  
  const result: Translation[] = []
  
  // 合法的词性白名单（小写），避免将 e.g. 等误判为词性
  const validPos = new Set([
      'n.', 'v.', 'vt.', 'vi.', 'adj.', 'adv.', 
      'prep.', 'conj.', 'pron.', 'int.', 'num.', 
      'art.', 'aux.', 'pl.', 'abbr.'
  ])
  
  let currentPos = '' 
  let currentMeaningsStr = ''
  
  for (const part of parts) {
      const trimmedPart = part.trim()
      if (!trimmedPart) continue
      
      // 检查是否是词性标记
      if (validPos.has(trimmedPart.toLowerCase())) {
          // 如果遇到了新词性，且之前有缓存的释义，则先保存之前的结果
          if (currentMeaningsStr.trim()) {
              const meanings = currentMeaningsStr.split(/[；;]/)
                  .map(m => m.trim())
                  .filter(m => m)
                  
              if (meanings.length > 0) {
                  result.push({
                      pos: currentPos || 'n.', // 如果之前没有词性，默认为 n.
                      meanings
                  })
              }
          }
          
          // 更新当前词性，清空释义缓存
          currentPos = trimmedPart
          currentMeaningsStr = ''
      } else {
          // 不是词性，则是释义内容
          currentMeaningsStr += part
      }
  }
  
  // 处理最后剩余的部分
  if (currentMeaningsStr.trim()) {
      const meanings = currentMeaningsStr.split(/[；;]/)
          .map(m => m.trim())
          .filter(m => m)
      
      if (meanings.length > 0) {
          result.push({
              pos: currentPos || 'n.', // 默认为 n.
              meanings
          })
      }
  }
  
  // 如果解析结果为空，尝试作为普通字符串处理
  if (result.length === 0) {
      const meanings = meaning.split(/[；;]/).map(m => m.trim()).filter(m => m)
      if (meanings.length > 0) {
          return [{
              pos: 'n.',
              meanings
          }]
      }
  }
  
  return result
}

/**
 * 批量翻译单词
 * @param words 单词列表（逗号分隔）
 * @returns Promise<ApiResponse<WordDictionary[]>> 返回翻译结果列表
 */
export const batchTranslate = (words: string): Promise<ApiResponse<WordDictionary[]>> => {
  return request.post('/wordbooks/match', null, {
    params: { words }
  })
}
