// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudyToday from './StudyToday.vue'

const api = vi.hoisted(() => ({
  getTodayStudy: vi.fn(),
  getWordBooks: vi.fn(),
  getStudySettings: vi.fn(),
  getStudyFollowups: vi.fn(),
  getStudyFollowupSummary: vi.fn(),
  recordStudyAction: vi.fn(),
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
    api.getStudyFollowups.mockResolvedValue({ code: 0, data: [] })
    api.getStudyFollowupSummary.mockResolvedValue({ code: 0, data: { passed: 0, failed: 0, skipped: 0 } })
    api.recordStudyAction.mockResolvedValue({ code: 0, data: '已记录' })
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

  it('explains that a later review does not affect todays saved check-in', async () => {
    api.getTodayStudy.mockResolvedValueOnce({ code: 0, data: {
      dueCount: 0, newRemaining: 0, todayReviewed: 44, todayNew: 15,
      checkedIn: true, nextDueAt: '2026-10-26T14:18:00Z', cards: []
    } })
    api.getWordBooks.mockResolvedValueOnce({ code: 0, data: [{ studyEnabled: true }] })
    const wrapper = mountStudy()
    await flushPromises()

    expect(wrapper.find('.complete-panel h2').text()).toBe('今天的学习已完成')
    expect(wrapper.find('.complete-panel').text()).toContain('已自动打卡')
    expect(wrapper.find('.complete-panel').text()).toContain('今天的打卡已保存')
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

  it('shows the scored word while saving and preparing the next card', async () => {
    let confirmReview!: (value: unknown) => void
    let finishReload!: (value: unknown) => void
    api.submitStudyReview.mockReturnValue(new Promise(resolve => { confirmReview = resolve }))
    api.getTodayStudy.mockReturnValueOnce(Promise.resolve({ code: 0, data: {
      dueCount: 0, newRemaining: 1, todayReviewed: 0, todayNew: 0, cards: [card]
    } })).mockReturnValueOnce(new Promise(resolve => { finishReload = resolve }))
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[3]!.trigger('click')

    expect(wrapper.find('.review-transition').text()).toContain('正在收好这次回忆')
    expect(wrapper.find('.review-transition').text()).toContain('hello')
    expect(wrapper.find('.attention-panel').exists()).toBe(false)

    confirmReview({ code: 0, data: { wordId: '123', version: 1 } })
    await flushPromises()
    expect(wrapper.find('.review-transition').text()).toContain('已记录，准备下一词')

    finishReload({ code: 0, data: { dueCount: 0, newRemaining: 0, todayReviewed: 1, todayNew: 1, cards: [] } })
    await flushPromises()
    expect(wrapper.find('.review-transition').exists()).toBe(false)
    wrapper.unmount()
  })

  it('plays the revealed word when the pronunciation button is clicked', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      rate = 1
      constructor(public text: string) {}
    })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.find('.audio-button').trigger('click')
    expect(speak).toHaveBeenCalledOnce()
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'hello', lang: 'en-US' })
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
    await wrapper.findAll('.rating-button')[0]!.trigger('click')
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
    await first.findAll('.rating-button')[0]!.trigger('click')
    await flushPromises()

    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    const original = api.submitStudyReview.mock.calls[0]![0]
    expect(original).toMatchObject({ wordId: '123', rating: 1, expectedVersion: 0 })
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

  it.each([1, 2] as const)('keeps rating %i while recording teaching separately', async rating => {
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
    expect(wrapper.find('.meaning').exists()).toBe(true)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    await flushPromises()
    expect(api.recordStudyAction).toHaveBeenCalledWith(expect.any(String), 'teaching', 'done')
    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
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

  it('lets a familiar new word continue without an unreviewed example', async () => {
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    await wrapper.findAll('.rating-button')[2]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.followup-flow').exists()).toBe(false)
    expect(api.getTodayStudy).toHaveBeenCalledTimes(2)
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
    first.unmount()

    api.getStudyFollowups.mockResolvedValue({ code: 0, data: [{
      ...card, requestId: api.submitStudyReview.mock.calls[0]![0].requestId,
      rating: 1, laterCards: 0, teachingResult: null, dueAt: '2099-01-01T00:00:00Z'
    }] })

    const second = mountStudy()
    await flushPromises()
    expect(second.find('.followup-flow').exists()).toBe(true)
    expect(second.find('.meaning').exists()).toBe(true)
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

  it('offers a separated echo without submitting another FSRS rating', async () => {
    api.getTodayStudy.mockResolvedValue({ code: 0, data: {
      dueCount: 0, newRemaining: 0, todayReviewed: 3, todayNew: 3, checkedIn: true, cards: []
    } })
    api.getStudyFollowups.mockResolvedValue({ code: 0, data: [{
      ...card, requestId: crypto.randomUUID(), rating: 1, laterCards: 2,
      teachingResult: 'done', dueAt: '2099-01-01T00:00:00Z'
    }] })
    const wrapper = mountStudy()
    await flushPromises()
    expect(wrapper.find('.followup-flow').text()).toContain('隔开后的再次回忆')
    expect(wrapper.find('.meaning').exists()).toBe(false)
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    expect(wrapper.find('.meaning').text()).toBe('你好')
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    await flushPromises()
    expect(api.recordStudyAction).toHaveBeenCalledWith(expect.any(String), 'revisit', 'revisit_pass')
    expect(api.submitStudyReview).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('这次找回来了')
    wrapper.unmount()
  })

  it('uses the official due card when its echo would duplicate a formal review', async () => {
    api.getTodayStudy.mockResolvedValue({ code: 0, data: {
      dueCount: 1, newRemaining: 0, todayReviewed: 1, todayNew: 1,
      cards: [{ ...card, newCard: false, state: 'LEARNING', version: 1, dueAt: '2026-01-01T00:00:00Z' }]
    } })
    api.getStudyFollowups.mockResolvedValue({ code: 0, data: [{
      ...card, requestId: crypto.randomUUID(), rating: 2, laterCards: 3,
      teachingResult: 'done', dueAt: '2026-01-01T00:00:00Z'
    }] })
    const wrapper = mountStudy()
    await flushPromises()
    expect(wrapper.find('.followup-flow').exists()).toBe(false)
    expect(wrapper.find('.reveal-button').exists()).toBe(true)
    wrapper.unmount()
  })

  it('uses reviewed context feedback as teaching evidence, never a replacement rating', async () => {
    api.getTodayStudy.mockResolvedValue({ code: 0, data: {
      dueCount: 0, newRemaining: 1, todayReviewed: 0, todayNew: 0,
      cards: [{ ...card, coreMeaning: '你好', contextSentence: 'Hello, Mia.',
        contextQuestion: '这句话里 hello 是什么意思？', optionA: '你好', optionB: '再见',
        correctOption: 'A', clueExplanation: '它是见面时的问候。', contentVersion: 'reviewed-1' }]
    } })
    api.submitStudyReview.mockResolvedValue({ code: 0, data: { wordId: '123', version: 1 } })
    const wrapper = mountStudy()
    await flushPromises()
    await wrapper.find('.reveal-button').trigger('click')
    expect(wrapper.findAll('.rating-button')[0]!.text()).toContain('不会')
    await wrapper.findAll('.rating-button')[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.context-question button')).toHaveLength(2)
    await wrapper.findAll('.context-question button')[1]!.trigger('click')
    expect(wrapper.find('.context-question').text()).toContain('见面时的问候')
    await wrapper.find('.followup-flow .primary-button').trigger('click')
    await flushPromises()
    expect(api.recordStudyAction).toHaveBeenCalledWith(expect.any(String), 'teaching', 'context_fail')
    expect(api.submitStudyReview.mock.calls[0]![0].rating).toBe(1)
    expect(api.submitStudyReview).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
