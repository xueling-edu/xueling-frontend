// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContextArticle from './ContextArticle.vue'

const contextApi = vi.hoisted(() => ({
  generateContextArticle: vi.fn(),
  getContextArticle: vi.fn(),
  getContextAttemptHistory: vi.fn(),
  listContextArticles: vi.fn(),
  submitContextAttempt: vi.fn()
}))
const vocabApi = vi.hoisted(() => ({ getStudyFamiliarity: vi.fn() }))
vi.mock('@/features/vocab/contextArticle', () => contextApi)
vi.mock('@/features/vocab/api', () => vocabApi)

const targets = ['art', 'river', 'calm', 'bright', 'wave'].map((word, index) => ({
  wordId: String(index + 1), word, meaning: word, offsets: [index === 0 ? 0 : [0, 4, 10, 15, 22][index]!]
}))
const article = { id: '9', title: 'A day', content: 'art river calm bright wave.', topic: null, targets, createTime: '2026-10-31T12:00:00' }

async function mountArticle() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/english/vocab/context', component: ContextArticle }] })
  await router.push('/english/vocab/context?article=9')
  await router.isReady()
  const wrapper = mount(ContextArticle, { global: { plugins: [router], stubs: {
    PageHeading: true,
    TopicPicker: true,
    SelectionWordLookup: { template: '<div><slot /></div>' }
  } } })
  await flushPromises()
  return { wrapper, router }
}

describe('context article practice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    Element.prototype.scrollIntoView = vi.fn()
    contextApi.getContextArticle.mockResolvedValue({ data: article })
    contextApi.getContextAttemptHistory.mockResolvedValue({ data: { attemptCount: 1, latest: {
      wordIds: ['1', '2', '3'], answers: ['art', 'wrong', 'calm'], correctCount: 2, totalCount: 3,
      createTime: '2026-10-31T12:30:00'
    } } })
    contextApi.listContextArticles.mockResolvedValue({ data: [] })
    contextApi.submitContextAttempt.mockResolvedValue({ data: { correctCount: 3, totalCount: 3 } })
    vocabApi.getStudyFamiliarity.mockResolvedValue({ data: { words: [], attentionWords: [], wordCount: 0, pageSize: 20 } })
  })

  it('restores the saved result and rotates words on the next attempt', async () => {
    const { wrapper } = await mountArticle()
    expect(wrapper.text()).toContain('最近一次答对 2 / 3 题')
    await wrapper.find('.practice-footer button:last-child').trigger('click')
    expect(wrapper.text()).toContain('本轮练习 3 / 5 个目标词')
    await wrapper.find('.reading-next button').trigger('click')
    const inputs = wrapper.findAll('.practice-item input')
    for (const [index, answer] of ['bright', 'wave', 'art'].entries()) await inputs[index]!.setValue(answer)
    await wrapper.find('.practice-footer button').trigger('click')
    await flushPromises()
    expect(contextApi.submitContextAttempt).toHaveBeenCalledWith('9', ['4', '5', '1'], ['bright', 'wave', 'art'])
    expect(wrapper.text()).toContain('本次答对 3 / 3 题')
    wrapper.unmount()
  })

  it('loads the article immediately when opened by its URL', async () => {
    const { wrapper, router } = await mountArticle()
    expect(contextApi.getContextArticle).toHaveBeenCalledWith('9')
    expect(vocabApi.getStudyFamiliarity).not.toHaveBeenCalled()
    await router.push('/english/vocab/context')
    await flushPromises()
    expect(wrapper.find('.compose-panel').exists()).toBe(true)
    wrapper.unmount()
  })
})
