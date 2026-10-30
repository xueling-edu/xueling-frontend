// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { useTranslate } from './useTranslate'

vi.mock('@/api/translate', () => ({ translateText: vi.fn() }))

describe('translation history storage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('keeps history separate when switching accounts and removes the unowned old key', async () => {
    const user = useUserStore()
    user.setUserInfo({ id: '7', username: '甲', email: '', avatar: '', vipLevel: 0 })
    localStorage.setItem('translate_history', JSON.stringify([{ word: 'old' }]))
    const translate = useTranslate()
    expect(localStorage.getItem('translate_history')).toBeNull()
    localStorage.setItem('xueling:translate-history:v1:7', JSON.stringify([{
      id: 'one', word: 'apple', timestamp: Date.now(), result: { word: 'apple', id: 'one', translations: [] },
    }]))
    user.setUserInfo({ id: '8', username: '乙', email: '', avatar: '', vipLevel: 0 })
    await nextTick()
    expect(translate.history.value).toEqual([])
    user.setUserInfo({ id: '7', username: '甲', email: '', avatar: '', vipLevel: 0 })
    await nextTick()
    expect(translate.history.value.map(item => item.word)).toEqual(['apple'])
  })
})
