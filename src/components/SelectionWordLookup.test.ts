// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SelectionWordLookup from './SelectionWordLookup.vue'
import { translateText } from '@/api/translate'

vi.mock('@/api/translate', () => ({ translateText: vi.fn() }))
vi.mock('@/utils/wordSpeech', () => ({ speakEnglishWord: vi.fn() }))

describe('selected word lookup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(translateText).mockResolvedValue({
      code: 0, msg: 'ok', data: { id: '1', word: 'garden', translations: [{ pos: 'n.', meanings: ['花园'] }] },
    })
  })
  afterEach(() => {
    window.getSelection()?.removeAllRanges()
    document.body.innerHTML = ''
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  async function selectText(text: string, protectedWords: string[] = []) {
    const host = document.createElement('div')
    document.body.append(host)
    const wrapper = mount(SelectionWordLookup, {
      attachTo: host,
      props: { protectedWords },
      slots: { default: `<p>${text}</p>` },
    })
    const node = wrapper.find('p').element.firstChild!
    const range = document.createRange()
    range.selectNodeContents(node)
    range.getBoundingClientRect = () => ({ left: 40, right: 90, top: 30, bottom: 50, width: 50, height: 20, x: 40, y: 30, toJSON: () => ({}) })
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    return wrapper
  }

  it('shows the meaning automatically for a selected word', async () => {
    const wrapper = await selectText('garden')
    expect(translateText).toHaveBeenCalledWith('garden')
    expect(document.body.textContent).toContain('花园')
    wrapper.unmount()
  })

  it('does not request a protected target word before reveal', async () => {
    const wrapper = await selectText('Garden', ['garden'])
    expect(translateText).not.toHaveBeenCalled()
    expect(document.querySelector('.selection-lookup-popover')).toBeNull()
    wrapper.unmount()
  })

  it('ignores a selected sentence', async () => {
    const wrapper = await selectText('garden grows')
    expect(translateText).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
