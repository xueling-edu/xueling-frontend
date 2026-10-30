// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useReviewStore } from './reviewStore'

describe('free-practice selection', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('restores a selection only for the same user and clears it on logout', () => {
    const store = useReviewStore()
    store.setReviewData(['word-1'], '我的词书', 'user-a')
    expect(store.reviewIds).toEqual(['word-1'])

    store.restoreReviewData('user-b')
    expect(store.reviewIds).toEqual([])
    expect(store.bookName).toBe('')

    store.restoreReviewData('user-a')
    expect(store.reviewIds).toEqual(['word-1'])
    store.clearReviewData()
    store.restoreReviewData('user-a')
    expect(store.reviewIds).toEqual([])
  })
})
