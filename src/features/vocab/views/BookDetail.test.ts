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

  it('opens content feedback for the word directly from its row', async () => {
    const wrapper = mountBook()
    await flushPromises()
    const firstRow = wrapper.findAll('.word-row')[0]!
    expect(firstRow.find('.more-button').exists()).toBe(false)
    await firstRow.find('.issue-link').trigger('click')
    expect(wrapper.findComponent({ name: 'WordIssueDialog' }).props('target')).toMatchObject({
      wordId: '1', word: 'word1', meaning: '释义1'
    })
    wrapper.unmount()
  })

  it('hides all meanings for recall and reveals only the chosen word', async () => {
    const wrapper = mountBook()
    await flushPromises()
    await wrapper.find('.meaning-toggle-all').trigger('click')
    expect(wrapper.find('.word-list').text()).not.toContain('释义1')
    expect(wrapper.findAll('.meaning-placeholder')).toHaveLength(50)

    await wrapper.findAll('.meaning-cell')[0]!.trigger('click')
    expect(wrapper.findAll('.word-row')[0]!.text()).toContain('释义1')
    expect(wrapper.findAll('.word-row')[1]!.text()).not.toContain('释义2')

    await wrapper.findAll('.pagination button')[1]!.trigger('click')
    expect(wrapper.findAll('.meaning-placeholder')).toHaveLength(5)
    await wrapper.find('.meaning-toggle-all').trigger('click')
    expect(wrapper.find('.word-list').text()).toContain('释义51')
    wrapper.unmount()
  })

  it('keeps meaning search usable while meanings are hidden', async () => {
    const wrapper = mountBook()
    await flushPromises()
    await wrapper.find('.meaning-toggle-all').trigger('click')
    await wrapper.find('.search-field input').setValue('释义55')
    expect(wrapper.findAll('.word-row')).toHaveLength(1)
    expect(wrapper.find('.word-list').text()).not.toContain('释义55')
    await wrapper.find('.meaning-cell').trigger('click')
    expect(wrapper.find('.word-list').text()).toContain('释义55')
    wrapper.unmount()
  })

  it('shows a waiting animation while word data is loading', async () => {
    let resolveDetail!: (value: unknown) => void
    api.getWordBookDetail.mockImplementationOnce(() => new Promise(resolve => { resolveDetail = resolve }))
    const wrapper = mountBook()
    expect(wrapper.find('.word-loading').attributes('aria-label')).toBe('正在加载词汇列表')
    expect(wrapper.findAll('.loading-row')).toHaveLength(3)
    expect(wrapper.find('.meaning-toggle-all').exists()).toBe(false)
    resolveDetail({ code: 0, data: { id: 'book-1', name: '四级词汇', bookType: 'SYSTEM', wordList: makeWords(1) } })
    await flushPromises()
    expect(wrapper.find('.word-loading').exists()).toBe(false)
    expect(wrapper.findAll('.word-row')).toHaveLength(1)
    wrapper.unmount()
  })
})
