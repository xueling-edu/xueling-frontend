/**
 * 翻译功能 Composable
 * 提供翻译相关的状态管理和业务逻辑
 */

import { ref, computed, watch } from 'vue'
import { translateText } from '@/api/translate'
import type { TranslateResult, TranslateHistory } from '@/types/translate'
import { useUserStore } from '@/stores/user'

const LEGACY_HISTORY_KEY = 'translate_history'
const historyKey = (userId: string) => `xueling:translate-history:v1:${userId}`
const MAX_HISTORY = 50
const HISTORY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function validHistoryItem(value: unknown): value is TranslateHistory {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<TranslateHistory>
  return typeof item.id === 'string' && typeof item.word === 'string'
    && Number.isFinite(item.timestamp) && !!item.result
    && typeof item.result.word === 'string' && Array.isArray(item.result.translations)
}

export function useTranslate() {
  const userStore = useUserStore()
  const userId = computed(() => userStore.userInfo?.id)
  const isTranslating = ref(false)
  const currentResult = ref<TranslateResult | null>(null)
  const error = ref<string>('')
  const history = ref<TranslateHistory[]>([])

  const loadHistory = (id?: string) => {
    history.value = []
    currentResult.value = null
    if (!id) return
    try {
      // 旧键没有用户归属，不能安全迁移到任何一个账号。
      localStorage.removeItem(LEGACY_HISTORY_KEY)
      const stored = localStorage.getItem(historyKey(id))
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        const now = Date.now()
        history.value = Array.isArray(parsed) ? parsed.filter(item =>
          validHistoryItem(item) && item.timestamp <= now
          && now - item.timestamp <= HISTORY_MAX_AGE_MS
        ).slice(0, MAX_HISTORY) : []
        if (history.value.length !== (Array.isArray(parsed) ? parsed.length : 0)) saveHistory(id)
      }
    } catch (e) {
      console.error('加载翻译历史失败:', e)
    }
  }

  // 保存历史记录到 localStorage
  const saveHistory = (id = userId.value) => {
    if (!id) return
    try {
      localStorage.setItem(historyKey(id), JSON.stringify(history.value))
    } catch (e) {
      console.error('保存翻译历史失败:', e)
    }
  }

  // 添加到历史记录
  const addToHistory = (word: string, result: TranslateResult) => {
    const newItem: TranslateHistory = {
      id: Date.now().toString(),
      word,
      result,
      timestamp: Date.now()
    }

    // 移除重复的单词
    history.value = history.value.filter(item => item.word.toLowerCase() !== word.toLowerCase())
    
    // 添加到开头
    history.value.unshift(newItem)
    
    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    
    saveHistory()
  }

  // 翻译单词
  const translate = async (text: string) => {
    if (!text.trim()) {
      error.value = '请输入要翻译的内容'
      return
    }

    isTranslating.value = true
    error.value = ''
    currentResult.value = null

    try {
      const requestUserId = userId.value
      const response = await translateText(text.trim())
      if (requestUserId !== userId.value) return
      
      if (response.code === 0 && response.data) {
        currentResult.value = response.data
        addToHistory(text.trim(), response.data)
      } else {
        error.value = response.msg || '翻译失败'
      }
    } catch (err: any) {
      error.value = err.message || '翻译失败，请稍后重试'
      console.error('翻译错误:', err)
    } finally {
      isTranslating.value = false
    }
  }

  // 从历史记录中删除
  const removeFromHistory = (id: string) => {
    history.value = history.value.filter(item => item.id !== id)
    saveHistory()
  }

  // 清空历史记录
  const clearHistory = () => {
    history.value = []
    saveHistory()
  }

  // 重新翻译历史记录中的单词
  const retranslate = async (word: string) => {
    await translate(word)
  }

  // 获取最近的历史记录
  const recentHistory = computed(() => {
    return history.value.slice(0, 5)
  })

  watch(userId, id => loadHistory(id), { immediate: true })

  return {
    isTranslating,
    currentResult,
    error,
    history,
    recentHistory,
    translate,
    removeFromHistory,
    clearHistory,
    retranslate
  }
}
