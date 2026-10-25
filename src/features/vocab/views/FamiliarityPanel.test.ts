// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FamiliarityPanel from './FamiliarityPanel.vue'

const api = vi.hoisted(() => ({ getStudyFamiliarity: vi.fn(), getStudySettings: vi.fn(), getWordBooks: vi.fn() }))
vi.mock('@/features/vocab/api', () => api)

const result = {
  learnedCount: 3, learningCount: 1, consolidatingCount: 1, stableCount: 1,
  dueCount: 1, wordCount: 3, page: 1, pageSize: 20,
  words: [{ wordId: '1', word: 'apple', meaning: '苹果', stage: 'LEARNING', inStudyPlan: true, due: false,
    dueAt: '2026-10-22T00:00:00Z', lapseCount: 0, lastRating: 3, stabilityDays: null }],
  attentionWords: []
}

describe('familiarity panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getWordBooks.mockResolvedValue({ data: [{ id: '12', name: '四级词书' }] })
    api.getStudySettings.mockResolvedValue({ data: { timeZone: 'Asia/Shanghai' } })
    api.getStudyFamiliarity.mockResolvedValue({ data: result })
  })

  it('loads stage and book filters without losing the deduplicated overview', async () => {
    const wrapper = mount(FamiliarityPanel, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    expect(wrapper.text()).toContain('已学习')
    expect(wrapper.text()).toContain('apple')
    await wrapper.find('.segment-action.stable').trigger('click')
    await flushPromises()
    expect(api.getStudyFamiliarity).toHaveBeenLastCalledWith({ bookId: undefined, stage: 'STABLE', page: 1 })
    await wrapper.find('select').setValue('12')
    await flushPromises()
    expect(api.getStudyFamiliarity).toHaveBeenLastCalledWith({ bookId: '12', stage: 'STABLE', page: 1 })
    wrapper.unmount()
  })

  it('shows a learned word outside the active plan as paused', async () => {
    api.getStudyFamiliarity.mockResolvedValueOnce({ data: {
      ...result,
      dueCount: 0,
      words: [{ ...result.words[0], inStudyPlan: false, due: false }]
    } })
    const wrapper = mount(FamiliarityPanel, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(wrapper.find('.word-meta').text()).toContain('已暂停')
    expect(wrapper.find('.word-meta').text()).not.toContain('待复习')
    wrapper.unmount()
  })

  it('formats the next review date using the saved study time zone', async () => {
    api.getStudyFamiliarity.mockResolvedValueOnce({ data: {
      ...result,
      words: [{ ...result.words[0], dueAt: '2026-10-20T16:30:00Z' }]
    } })
    const wrapper = mount(FamiliarityPanel, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(wrapper.find('.word-meta').text()).toContain('10月21日')
    wrapper.unmount()
  })
})
