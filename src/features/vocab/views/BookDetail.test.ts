// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BookDetail from './BookDetail.vue'

const api = vi.hoisted(() => ({
  getWordBookDetail: vi.fn(),
  setStudyBookEnabled: vi.fn(),
  matchWords: vi.fn(),
  addWordsToBook: vi.fn(),
  removeWordsFromBook: vi.fn()
}))
const navigation = vi.hoisted(() => ({ push: vi.fn() }))
const review = vi.hoisted(() => ({ setReviewData: vi.fn() }))

vi.mock('@/features/vocab/api', () => api)
vi.mock('@/features/vocab/reviewStore', () => ({ useReviewStore: () => review }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'book-1' } }),
  useRouter: () => navigation
}))

function makeWords(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    word: 'word' + (index + 1),
    phonetic: 'wɜːd',
    meaning: '释义' + (index + 1)
  }))
}

function mountBook() {
  return shallowMount(BookDetail, { global: { stubs: { 'el-dialog': true, 'el-button': true, 'el-input': true } } })
}

describe('word book detail', () => {
  afterEach(() => vi.unstubAllGlobals())
  beforeEach(() => {
    vi.clearAllMocks()
    api.getWordBookDetail.mockResolvedValue({ code: 0, data: {
      id: 'book-1', name: '四级词汇', bookType: 'SYSTEM', wordCount: 55,
      learnedCount: 12, learningCoverage: 22, studyEnabled: false,
      wordList: makeWords(55)
    } })
    api.setStudyBookEnabled.mockResolvedValue({ code: 0, data: 'ok' })
  })

  it('keeps selected words across pages and starts a 5-word free practice', async () => {
    const wrapper = mountBook()
    await flushPromises()
    expect(wrapper.findAll('.word-row')).toHaveLength(50)
    await wrapper.find('.word-row input[type="checkbox"]').setValue(true)
    await wrapper.findAll('.pagination button')[1]!.trigger('click')
    expect(wrapper.findAll('.word-row')).toHaveLength(5)
    for (const row of wrapper.findAll('.word-row').slice(0, 4)) {
      await row.find('input[type="checkbox"]').setValue(true)
    }
    expect(wrapper.find('.selection-bar').text()).toContain('已选 5 / 10 词')
    await wrapper.find('.begin-practice').trigger('click')
    expect(review.setReviewData).toHaveBeenCalledWith(['1', '51', '52', '53', '54'], '四级词汇')
    expect(navigation.push).toHaveBeenCalledWith('/english/vocab/review/book-1')
    wrapper.unmount()
  })

  it('shows the plan action and switches to daily study after adding the book', async () => {
    const wrapper = mountBook()
    await flushPromises()
    expect(wrapper.text()).toContain('学习覆盖率 · 已学习 12 / 55')
    expect(wrapper.find('.add-button').exists()).toBe(false)
    await wrapper.find('.primary-action').trigger('click')
    await flushPromises()
    expect(api.setStudyBookEnabled).toHaveBeenCalledWith('book-1', true)
    expect(wrapper.find('.primary-action').text()).toContain('进入今日学习')
    wrapper.unmount()
  })

  it('plays a word from the book list', async () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = ''
      rate = 1
      constructor(public text: string) {}
    })
    const wrapper = mountBook()
    await flushPromises()
    await wrapper.find('.audio-button').trigger('click')
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'word1', lang: 'en-US' })
    wrapper.unmount()
  })
})
