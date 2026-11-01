// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudyGrowthCalendar from './StudyGrowthCalendar.vue'

const api = vi.hoisted(() => ({ getStudyCalendar: vi.fn() }))
vi.mock('@/features/vocab/api', () => api)

function response(month: string) {
  return { data: {
    month, today: '2026-10-21', checkedInToday: false, currentStreak: 2,
    longestStreak: 4, totalCheckIns: 8,
    days: [
      { date: `${month}-01`, checkedIn: true, reviewCount: 12, newWords: 3, studyTimeMs: 180000 },
      { date: `${month}-02`, checkedIn: false, reviewCount: 2, newWords: 0, studyTimeMs: 12000 }
    ]
  } }
}

describe('growth calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getStudyCalendar.mockResolvedValue(response('2026-10'))
  })

  it('shows saved check-ins separately from incomplete practice and browses months', async () => {
    const wrapper = shallowMount(StudyGrowthCalendar, { global: { stubs: { 'router-link': true } } })
    await flushPromises()

    expect(wrapper.find('.growth-stats').text()).toContain('2天')
    expect(wrapper.findAll('.day-cell.checked')).toHaveLength(1)
    expect(wrapper.findAll('.day-cell.practiced')).toHaveLength(1)
    expect(wrapper.find('.day-cell.checked').attributes('aria-label')).toContain('已打卡')
    expect(wrapper.find('.day-cell.practiced').attributes('aria-label')).toContain('尚无打卡')

    api.getStudyCalendar.mockResolvedValueOnce(response('2026-09'))
    await wrapper.find('[aria-label="上个月"]').trigger('click')
    await flushPromises()
    expect(api.getStudyCalendar).toHaveBeenLastCalledWith('2026-09')
    expect(wrapper.find('.month-value').text()).toBe('2026 年 9 月')
    wrapper.unmount()
  })

  it('jumps directly to a past month and blocks future months', async () => {
    const wrapper = shallowMount(StudyGrowthCalendar, { global: { stubs: { 'router-link': true } } })
    await flushPromises()

    await wrapper.find('.jump-trigger').trigger('click')
    expect(wrapper.find('[aria-label="2026 年 11 月"]').attributes('disabled')).toBeDefined()
    await wrapper.find('[aria-label="上一年"]').trigger('click')
    expect(wrapper.find('.jump-year strong').text()).toBe('2025 年')

    api.getStudyCalendar.mockResolvedValueOnce(response('2025-03'))
    await wrapper.find('[aria-label="2025 年 3 月"]').trigger('click')
    await flushPromises()
    expect(api.getStudyCalendar).toHaveBeenLastCalledWith('2025-03')
    expect(wrapper.find('.month-value').text()).toBe('2025 年 3 月')
    expect(wrapper.find('.jump-panel').exists()).toBe(false)

    await wrapper.find('.jump-trigger').trigger('click')
    api.getStudyCalendar.mockResolvedValueOnce(response('2026-10'))
    await wrapper.find('.jump-current').trigger('click')
    await flushPromises()
    expect(api.getStudyCalendar).toHaveBeenLastCalledWith('2026-10')
    wrapper.unmount()
  })
})
