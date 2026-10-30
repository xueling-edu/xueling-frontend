// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CardReview from './CardReview.vue'

const api = vi.hoisted(() => ({ getWordBookDetail: vi.fn(), getWordsByIds: vi.fn(), getWordFamily: vi.fn() }))
vi.mock('@/features/vocab/api', () => api)
vi.mock('@/features/vocab/reviewStore', () => ({ useReviewStore: () => ({
  reviewIds: ['1', '2', '3', '4', '5'], bookName: '测试词书', restoreReviewData: vi.fn()
}) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { id: 'user-7' } }) }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'book-1' }, query: {} }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() })
}))
vi.mock('@/utils/wordSpeech', () => ({
  cancelEnglishWord: vi.fn(), preloadEnglishWord: vi.fn(), speakEnglishWord: vi.fn(() => true)
}))

describe('free-practice recap', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.useRealTimers())

  it('covers every selected word and renders dictionary text without HTML interpretation', async () => {
    api.getWordBookDetail.mockResolvedValue({ code: 0, data: { wordList: Array.from({ length: 5 }, (_, index) => ({ id: String(index + 1) })) } })
    api.getWordsByIds.mockResolvedValue({ code: 0, data: Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1), word: index === 0 ? '<img src=x onerror=alert(1)>' : `word${index + 1}`,
      meaning: `释义${index + 1}`, phonetic: '', example: '', exampleTranslation: ''
    })) })
    api.getWordFamily.mockResolvedValue({ code: 0, data: null })
    const wrapper = shallowMount(CardReview, { global: { stubs: {
      'el-page-header': true, 'el-progress': true, 'el-icon': true,
      'el-button': true, 'el-input': true, WordFamilyTree: true
    } } })
    await flushPromises()
    vi.useFakeTimers()
    for (let index = 0; index < 5; index++) {
      await wrapper.find('.flashcard').trigger('click')
      await wrapper.find('.action-btn.remember').trigger('click')
      vi.advanceTimersByTime(300)
      await nextTick()
    }
    await wrapper.find('.consolidate-btn').trigger('click')
    expect(wrapper.findAll('.recap-item')).toHaveLength(5)
    expect(wrapper.find('.recap-item').text()).toContain('<img src=x onerror=alert(1)>')
    expect(wrapper.find('.recap-item img').exists()).toBe(false)
    expect(wrapper.findAll('.recap-word').every(button => button.element.tagName === 'BUTTON')).toBe(true)
    await wrapper.find('.action-toggle').trigger('click')
    expect(wrapper.find('.recap-word').text()).toContain('点击拼写')
    expect(wrapper.find('.check-word').text()).toContain('待拼写 · 第 1 词')
    wrapper.unmount()
  })

  it('rejects a stale selection before fetching word details', async () => {
    api.getWordBookDetail.mockResolvedValue({ code: 0, data: { wordList: [{ id: '1' }] } })
    const wrapper = shallowMount(CardReview, { global: { stubs: {
      'el-page-header': true, 'el-progress': true, 'el-icon': true,
      'el-button': true, 'el-input': true, WordFamilyTree: true
    } } })
    await flushPromises()
    expect(wrapper.find('.review-state[role="alert"]').text()).toContain('所选单词已不在当前词书中')
    expect(api.getWordsByIds).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
