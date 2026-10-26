// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EnglishDashboard from './EnglishDashboard.vue'

const api = vi.hoisted(() => ({ getStudyStats: vi.fn(), getWordBooks: vi.fn() }))
vi.mock('@/features/vocab/api', () => api)

describe('EnglishDashboard check-in status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getWordBooks.mockResolvedValue({ data: [{ studyEnabled: true }] })
  })

  it('shows the saved check-in even when another card has become due', async () => {
    api.getStudyStats.mockResolvedValue({ data: {
      todayReviewed: 44, todayNew: 15, dueCount: 1, checkedIn: true
    } })

    const wrapper = shallowMount(EnglishDashboard, { global: { stubs: { 'router-link': true } } })
    await flushPromises()

    expect(wrapper.find('#daily-focus-title').text()).toBe('今日已自动打卡')
    expect(wrapper.find('.focus-description').text()).toContain('另有 1 张卡片可以再次复习')
    wrapper.unmount()
  })

  it('does not call an unfinished day complete just because nothing is due now', async () => {
    api.getStudyStats.mockResolvedValue({ data: {
      todayReviewed: 4, todayNew: 1, dueCount: 0, checkedIn: false
    } })

    const wrapper = shallowMount(EnglishDashboard, { global: { stubs: { 'router-link': true } } })
    await flushPromises()

    expect(wrapper.find('#daily-focus-title').text()).toBe('继续完成今日学习')
    wrapper.unmount()
  })
})
