// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudyInsights from './StudyInsights.vue'

const api = vi.hoisted(() => ({ getStudyFamiliarity: vi.fn(), getStudyHistory: vi.fn() }))
vi.mock('@/features/vocab/api', () => api)
const stubs = { RouterLink: { template: '<a><slot /></a>' }, StudyGrowthCalendar: true }

describe('study insights overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
    api.getStudyFamiliarity.mockResolvedValue({ data: {
      learnedCount: 12, learningCount: 3, consolidatingCount: 4, stableCount: 5, dueCount: 2,
      wordCount: 12, page: 1, pageSize: 20, words: [], attentionWords: []
    } })
    api.getStudyHistory.mockResolvedValue({ data: [
      { date: '2026-10-20', reviewCount: 4, newWords: 1, studyTimeMs: 60000,
        dueRecallAttempts: 2, dueRecallRate: 0.5, goodOrEasyRate: 0.5, dueBacklog: 0 }
    ] })
  })

  it('keeps the calendar visible and summarizes memory and recent study', async () => {
    const wrapper = mount(StudyInsights, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('study-growth-calendar-stub').exists()).toBe(true)
    expect(api.getStudyFamiliarity).toHaveBeenCalledWith({ stage: 'ALL', page: 1 })
    expect(api.getStudyHistory).toHaveBeenCalledWith(7)
    expect(wrapper.find('.memory-number').text()).toContain('12')
    expect(wrapper.find('.stage-links').text()).toContain('较稳固5')
    expect(wrapper.find('.recent-summary').text()).toContain('4 次回忆')
    expect(wrapper.text()).toContain('有 2 个词待复习')
    wrapper.unmount()
  })

  it('shows the calendar directly from the growth-calendar link', async () => {
    window.location.hash = '#growth-calendar'
    const wrapper = mount(StudyInsights, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('study-growth-calendar-stub').exists()).toBe(true)
    wrapper.unmount()
    window.location.hash = ''
  })
})
