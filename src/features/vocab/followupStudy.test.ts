// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistFollowup, restoreFollowup } from './followupStudy'
import type { FollowupStudy } from './followupStudy'

const followup: FollowupStudy = {
  requestId: 'saved-review', rating: 1, step: 'study', confirmed: true,
  card: { wordId: '123', word: 'apple', meaning: '苹果', state: 'REVIEW', version: 1, newCard: false },
}

describe('followup session recovery', () => {
  beforeEach(() => { sessionStorage.clear(); vi.useRealTimers() })

  it('restores fresh state and discards it after seven days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'))
    persistFollowup('7', followup)
    expect(restoreFollowup('7')).toEqual(followup)
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'))
    expect(restoreFollowup('7')).toBeNull()
    expect(sessionStorage.getItem('study.followup.7')).toBeNull()
    vi.useRealTimers()
  })
})
