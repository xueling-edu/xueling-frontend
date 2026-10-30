import type { StudyQueueCard } from './types'

const FOLLOWUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface FollowupStudy {
  requestId: string
  rating: 1 | 2 | 3
  card: StudyQueueCard
  step: 'study' | 'context' | 'recall' | 'checked'
  confirmed: boolean
  mode?: 'teaching' | 'revisit'
  diagnosis?: 'meaning_slow' | 'context_unsure'
}

function storageKey(userId: string) {
  return `study.followup.${userId}`
}

function validFollowup(value: unknown): value is FollowupStudy {
  if (!value || typeof value !== 'object') return false
  const followup = value as Partial<FollowupStudy>
  const card = followup.card
  return typeof followup.requestId === 'string'
    && Number.isInteger(followup.rating) && followup.rating! >= 1 && followup.rating! <= 3
    && (followup.step === 'study' || followup.step === 'context' || followup.step === 'recall' || followup.step === 'checked')
    && typeof followup.confirmed === 'boolean'
    && !!card && typeof card.wordId === 'string' && typeof card.word === 'string'
    && typeof card.meaning === 'string' && Number.isInteger(card.version)
    && typeof card.newCard === 'boolean'
}

export function restoreFollowup(userId?: string): FollowupStudy | null {
  if (!userId) return null
  try {
    const raw = sessionStorage.getItem(storageKey(userId))
    if (!raw) return null
    const stored: unknown = JSON.parse(raw)
    // 兼容旧版直接保存的会话数据；新版数据带时间戳以清理陈旧页面状态。
    if (validFollowup(stored)) {
      persistFollowup(userId, stored)
      return stored
    }
    if (stored && typeof stored === 'object') {
      const entry = stored as { savedAt?: number; followup?: unknown }
      if (Number.isFinite(entry.savedAt) && entry.savedAt! <= Date.now()
        && Date.now() - entry.savedAt! <= FOLLOWUP_MAX_AGE_MS
        && validFollowup(entry.followup)) return entry.followup
    }
    sessionStorage.removeItem(storageKey(userId))
  } catch { /* 存储不可用时，仍可继续在线学习。 */ }
  return null
}

export function persistFollowup(userId: string | undefined, followup: FollowupStudy) {
  if (!userId) return
  try { sessionStorage.setItem(storageKey(userId), JSON.stringify({ savedAt: Date.now(), followup })) } catch { /* 继续在线学习。 */ }
}

export function clearFollowup(userId?: string) {
  if (!userId) return
  try { sessionStorage.removeItem(storageKey(userId)) } catch { /* 无需阻断学习。 */ }
}
