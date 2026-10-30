// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackView from './FeedbackView.vue'

const api = vi.hoisted(() => ({
  createFeedback: vi.fn(),
  getFeedbackAdminAccess: vi.fn(),
  getMyFeedback: vi.fn(),
  getAdminFeedback: vi.fn(),
  updateFeedback: vi.fn(),
}))
vi.mock('../api', () => api)
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { id: '123' } }) }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { from: '/settings' } }) }))

const mountView = () => mount(FeedbackView, {
  global: { stubs: {
    PageHeading: true,
    'el-button': { template: '<button><slot /></button>' },
    'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  } },
})

describe('feedback view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    api.getFeedbackAdminAccess.mockResolvedValue({ data: false })
    api.getMyFeedback.mockResolvedValue({ data: [] })
  })

  it('keeps the same request id for a failed submission and shows a receipt after retry', async () => {
    api.createFeedback.mockRejectedValueOnce({ msg: '网络错误' }).mockResolvedValueOnce({ data: {
      id: '987654321012345678', userId: '123', category: 'FEATURE_IDEA', content: '希望添加学习提醒',
      status: 'PENDING', createTime: '2026-10-22T10:00:00', updateTime: '2026-10-22T10:00:00',
    } })
    const wrapper = mountView()
    await flushPromises()
    await wrapper.get('#feedback-content').setValue('希望添加学习提醒')
    const submit = wrapper.findAll('.form-footer button')[0]!
    await submit.trigger('click')
    await flushPromises()
    expect(api.createFeedback).toHaveBeenCalledTimes(1)
    const firstRequest = api.createFeedback.mock.calls[0]![0]
    expect(firstRequest.sourcePage).toBe('/settings')

    await submit.trigger('click')
    await flushPromises()
    expect(api.createFeedback.mock.calls[1]![0].requestId).toBe(firstRequest.requestId)
    expect(wrapper.text()).toContain('987654321012345678')
    expect(localStorage.getItem('xueling-feedback-draft:123')).toBeNull()
    wrapper.unmount()
  })

  it('restores a saved draft for the current user', async () => {
    localStorage.setItem('xueling-feedback-draft:123', JSON.stringify({
      requestId: crypto.randomUUID(), category: 'FUNCTION_ISSUE', content: '复习按钮无法点击', contact: 'test@example.com',
    }))
    const wrapper = mountView()
    await flushPromises()
    expect((wrapper.get('#feedback-content').element as HTMLTextAreaElement).value).toBe('复习按钮无法点击')
    expect((wrapper.get('#feedback-contact').element as HTMLInputElement).value).toBe('test@example.com')
    expect(JSON.parse(localStorage.getItem('xueling-feedback-draft:123')!).savedAt).toBeTypeOf('number')
    wrapper.unmount()
  })

  it('removes an expired draft without restoring its contact details', async () => {
    localStorage.setItem('xueling-feedback-draft:123', JSON.stringify({
      savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      form: { requestId: crypto.randomUUID(), category: 'FUNCTION_ISSUE', content: '旧草稿内容', contact: 'old@example.com' },
    }))
    const wrapper = mountView()
    await flushPromises()
    expect((wrapper.get('#feedback-content').element as HTMLTextAreaElement).value).toBe('')
    expect(localStorage.getItem('xueling-feedback-draft:123')).toBeNull()
    wrapper.unmount()
  })
})
