// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudyHistory from './StudyHistory.vue'

const api = vi.hoisted(() => ({
  getStudyHistory: vi.fn(),
  getStudyReviewCounts: vi.fn()
}))
vi.mock('@/features/vocab/api', () => api)
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('study history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
    api.getStudyHistory.mockImplementation((days: number) => Promise.resolve({ data: [{
      date: '2026-10-20', reviewCount: days === 7 ? 0 : 4,
      newWords: 1, studyTimeMs: 60000, dueRecallAttempts: days === 7 ? 0 : 2,
      dueRecallRate: days === 7 ? null : 0.5, goodOrEasyRate: days === 7 ? null : 0.5, dueBacklog: 3
    }] }))
    api.getStudyReviewCounts.mockResolvedValue({ data: {
      once: 1, twice: 2, threeToFive: 3, sixOrMore: 4
    } })
  })

  it('shows no recall rate without samples and updates the selected range', async () => {
    const wrapper = mount(StudyHistory, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    expect(wrapper.text()).toContain('近 7 天回顾')
    expect(api.getStudyReviewCounts).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('样本 0 次')
    expect(wrapper.text()).toContain('每词回忆次数')

    await wrapper.findAll('.range-switch button')[1]!.trigger('click')
    await flushPromises()
    expect(api.getStudyHistory).toHaveBeenLastCalledWith(30)
    expect(wrapper.text()).toContain('样本 2 次')
    expect(wrapper.text()).toContain('50%')
    wrapper.unmount()
  })

  it('keeps the newest range when responses arrive out of order', async () => {
    let resolveSeven!: (value: unknown) => void
    let resolveThirty!: (value: unknown) => void
    const seven = new Promise(resolve => { resolveSeven = resolve })
    const thirty = new Promise(resolve => { resolveThirty = resolve })
    api.getStudyHistory.mockImplementation((value: number) => value === 7 ? seven : thirty)
    const wrapper = mount(StudyHistory, { global: { stubs: { RouterLink: true } } })
    await wrapper.findAll('.range-switch button')[1]!.trigger('click')
    resolveThirty({ data: [{ date: '2026-10-20', reviewCount: 30, newWords: 0,
      studyTimeMs: 0, dueRecallAttempts: 0, dueRecallRate: null, goodOrEasyRate: null, dueBacklog: 0 }] })
    await flushPromises()
    resolveSeven({ data: [{ date: '2026-10-20', reviewCount: 7, newWords: 0,
      studyTimeMs: 0, dueRecallAttempts: 0, dueRecallRate: null, goodOrEasyRate: null, dueBacklog: 0 }] })
    await flushPromises()
    expect(wrapper.find('.summary').text()).toContain('回忆次数30')
    expect(wrapper.find('.summary').text()).not.toContain('回忆次数7')
    wrapper.unmount()
  })

})
