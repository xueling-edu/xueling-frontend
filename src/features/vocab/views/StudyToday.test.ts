// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudyToday from './StudyToday.vue'

const api = vi.hoisted(() => ({
  getTodayStudy: vi.fn(),
  getWordBooks: vi.fn(),
  getStudySettings: vi.fn(),
  submitStudyReview: vi.fn(),
  updateStudySettings: vi.fn()
}))

vi.mock('@/features/vocab/api', () => api)
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { id: '7' } }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const card = {
  wordId: '123', word: 'hello', meaning: '你好', state: 'NEW',
  version: 0, newCard: true
}

function mountStudy() {
  return shallowMount(StudyToday, { global: { stubs: {
    'el-dialog': true, 'el-form': true, 'el-form-item': true,
    'el-input-number': true, 'el-slider': true, 'el-input': true, 'el-button': true
  } } })
}

describe('today study review recovery', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    api.getTodayStudy.mockResolvedValue({ code: 0, data: {
      dueCount: 0, newRemaining: 1, todayReviewed: 0, todayNew: 0, cards: [card]
    } })
    api.getStudySettings.mockResolvedValue({ code: 0, data: {
      timeZone: 'Asia/Shanghai', dailyNewLimit: 15, desiredRetention: 0.9
    } })
    api.getWordBooks.mockResolvedValue({ code: 0, data: [] })
  })

  it('guides a new learner to choose a book instead of reporting a completed task', async () => {
    api.getTodayStudy.mockResolvedValueOnce({ code: 0, data: {
      dueCount: 0, newRemaining: 0, todayReviewed: 0, todayNew: 0, checkedIn: false, cards: []
    } })
    const wrapper = mountStudy()
    await flushPromises()

    expect(wrapper.find('.setup-panel h2').text()).toBe('先选一本词书')
    expect(wrapper.text()).toContain('将词书加入学习计划后')
    expect(wrapper.find('.complete-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps pronunciation and examples behind the answer until recall is attempted', async () => {
    api.getTodayStudy.mockResolvedValueOnce({ code: 0, data: {
      dueCount: 1, newRemaining: 0, todayReviewed: 0, todayNew: 0,
      cards: [{ ...card, newCard: false, phonetic: 'həˈləʊ', example: 'Hello, world.', exampleTranslation: '你好，世界。' }]
    } })
    const wrapper = mountStudy()
    await flushPromises()

    expect(wrapper.find('.phonetic').exists()).toBe(false)
    expect(wrapper.find('.audio-button').exists()).toBe(false)
    expect(wrapper.find('.example-disclosure').exists()).toBe(false)
    expect(wrapper.find('.reveal-button').text()).toContain('已回忆，查看答案')

    await wrapper.find('.reveal-button').trigger('click')
    expect(wrapper.find('.meaning').text()).toBe('你好')
    expect(wrapper.find('.phonetic').exists()).toBe(true)
    expect(wrapper.find('.audio-button').exists()).toBe(true)
    expect(wrapper.find('.example-disclosure').attributes('open')).toBeUndefined()
    expect(wrapper.findAll('.rating-button')).toHaveLength(4)
    wrapper.unmount()
  })

  it('lays out escaped multiline meanings as separate parts of speech', async () => {
    api.getTodayStudy.mockResolvedValueOnce({ code: 0, data: {
      dueCount: 1, newRemaining: 0, todayReviewed: 0, todayNew: 0,
      cards: [{ ...card, word: 'toward', meaning: 'prep. 向, 对于, 为了\\na. 即将来临的, 进行中的' }]
    } })
    const wrapper = mountStudy()
    await flushPromises()
    expect(wrapper.find('.definition-row').exists()).toBe(false)

    await wrapper.find('.reveal-button').trigger('click')
    const rows = wrapper.findAll('.definition-row')
    expect(rows).toHaveLength(2)
    expect(rows.map(row => row.find('.part-of-speech').text())).toEqual(['prep.', 'a.'])
    expect(rows.map(row => row.find('.meaning').text())).toEqual(['向，对于，为了', '即将来临的，进行中的'])
    expect(wrapper.find('.definition-toggle').exists()).toBe(false)
    wrapper.unmount()
  })

  it('previews a long definition and reveals every entry on request', async () => {
    const longMeaning = '用于说明复杂情况下仍然需要完整展示的中文释义'.repeat(3)
    api.getTodayStudy.mockResolvedValueOnce({ code: 0, data: {
      dueCount: 1, newRemaining: 0, todayReviewed: 0, todayNew: 0,
      cards: [{ ...card, meaning: `n. ${longMeaning}\\nvt. 第二条释义\\nadj. 第三条释义` }]
    } }).mockResolvedValueOnce({ code: 0, data: {
      dueCount: 1, newRemaining: 0, todayReviewed: 1, todayNew: 0,
      cards: [{ ...card, wordId: '456', version: 1, meaning: `n. ${longMeaning}\\nvt. 第二条释义\\nadj. 第三条释义` }]
    } })
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')

    expect(wrapper.findAll('.definition-row')).toHaveLength(2)
    expect(wrapper.find('.definition-row .meaning').text().endsWith('…')).toBe(true)
    await wrapper.find('.definition-toggle').trigger('click')
    expect(wrapper.findAll('.definition-row')).toHaveLength(3)
    expect(wrapper.find('.definition-row .meaning').text()).toBe(longMeaning)
    expect(wrapper.find('.definition-toggle').attributes('aria-expanded')).toBe('true')
    await wrapper.find('.definition-toggle').trigger('click')
    expect(wrapper.findAll('.definition-row')).toHaveLength(2)
    await wrapper.find('.definition-toggle').trigger('click')
    await wrapper.findAll('.rating-button')[2]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.followup-flow').exists()).toBe(true)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    expect(wrapper.findAll('.definition-row')).toHaveLength(2)
    expect(wrapper.find('.definition-toggle').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('replays the same rating after refresh and then reloads server progress', async () => {
    api.submitStudyReview.mockRejectedValueOnce(new Error('network interrupted'))
      .mockResolvedValueOnce({ code: 0, data: { wordId: '123', version: 1 } })
    const first = mountStudy()
    await flushPromises()
    await first.find('.reveal-button').trigger('click')
    await first.findAll('.rating-button')[2]!.trigger('click')
    await flushPromises()

    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    const original = api.submitStudyReview.mock.calls[0]![0]
    expect(original).toMatchObject({ wordId: '123', rating: 3, expectedVersion: 0 })
    expect(sessionStorage.getItem('study.pending-review.7')).not.toBeNull()
    expect(first.text()).not.toContain('同步最新学习计划')
    first.unmount()

    const second = mountStudy()
    await flushPromises()
    expect(api.submitStudyReview).toHaveBeenCalledTimes(2)
    expect(api.submitStudyReview.mock.calls[1]![0]).toEqual(original)
    expect(sessionStorage.getItem('study.pending-review.7')).toBeNull()
    expect(api.getTodayStudy).toHaveBeenCalledTimes(2)
    expect(second.find('.followup-flow').exists()).toBe(true)
    second.unmount()
  })

  it.each([1, 2] as const)('keeps rating %i on the word through a second recall', async rating => {
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[rating - 1]!.trigger('click')
    await flushPromises()

    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    expect(api.submitStudyReview.mock.calls[0]![0].rating).toBe(rating)
    expect(api.getTodayStudy).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.meaning').exists()).toBe(true)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    if (rating === 1) {
      expect(wrapper.find('.followup-flow').text()).toContain('听发音')
      await wrapper.find('.followup-flow .primary-button').trigger('click')
    }
    expect(wrapper.find('.meaning').exists()).toBe(false)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    expect(wrapper.find('.meaning').exists()).toBe(true)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    await flushPromises()
    expect(api.getTodayStudy).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('moves on immediately after an easy rating', async () => {
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[3]!.trigger('click')
    await flushPromises()
    expect(api.getTodayStudy).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.followup-flow').exists()).toBe(false)
    wrapper.unmount()
  })

  it('restores an unfinished follow-up after a refresh', async () => {
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const first = mountStudy()
    await flushPromises()
    await first.find('.reveal-button').trigger('click')
    await first.findAll('.rating-button')[0]!.trigger('click')
    await flushPromises()
    await first.find('.followup-flow .primary-button').trigger('click')
    await first.find('.followup-flow .primary-button').trigger('click')
    first.unmount()

    const second = mountStudy()
    await flushPromises()
    expect(second.find('.followup-flow').exists()).toBe(true)
    expect(second.find('.meaning').exists()).toBe(false)
    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    second.unmount()
  })

  it('does not treat an unconfirmed follow-up draft as a saved rating', async () => {
    sessionStorage.setItem('study.followup.7', JSON.stringify({
      requestId: 'draft', rating: 1, card, step: 'study', confirmed: false
    }))
    const wrapper = mountStudy()
    await flushPromises()
    expect(wrapper.find('.followup-flow').exists()).toBe(false)
    expect(sessionStorage.getItem('study.followup.7')).toBeNull()
    expect(wrapper.find('.reveal-button').exists()).toBe(true)
    wrapper.unmount()
  })

  it('submits a rating on an HTTP LAN page without crypto.randomUUID', async () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues })
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })

    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[2]!.trigger('click')
    await flushPromises()

    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    expect(api.submitStudyReview.mock.calls[0]![0].requestId)
      .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    wrapper.unmount()
  })

  it('offers a fresh queue after a confirmed stale-card rejection', async () => {
    api.submitStudyReview.mockRejectedValueOnce({ code: 500, msg: '卡片已在其他设备更新，请刷新今日学习' })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[2]!.trigger('click')
    await flushPromises()

    const refresh = wrapper.findAll('button').find(button => button.text().includes('同步最新学习计划'))
    expect(refresh).toBeDefined()
    await refresh!.trigger('click')
    await flushPromises()
    expect(sessionStorage.getItem('study.pending-review.7')).toBeNull()
    expect(sessionStorage.getItem('study.followup.7')).toBeNull()
    expect(api.getTodayStudy).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
