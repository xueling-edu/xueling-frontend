import type { StudyQueueCard } from './types'

export interface FollowupStudy {
  requestId: string
  rating: 1 | 2 | 3
  card: StudyQueueCard
  step: 'study' | 'context' | 'recall' | 'checked'
  confirmed: boolean
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
    const followup: unknown = JSON.parse(raw)
    if (validFollowup(followup)) return followup
    sessionStorage.removeItem(storageKey(userId))
  } catch { /* 存储不可用时，仍可继续在线学习。 */ }
  return null
}

export function persistFollowup(userId: string | undefined, followup: FollowupStudy) {
  if (!userId) return
  try { sessionStorage.setItem(storageKey(userId), JSON.stringify(followup)) } catch { /* 继续在线学习。 */ }
}

export function clearFollowup(userId?: string) {
  if (!userId) return
  try { sessionStorage.removeItem(storageKey(userId)) } catch { /* 无需阻断学习。 */ }
}
