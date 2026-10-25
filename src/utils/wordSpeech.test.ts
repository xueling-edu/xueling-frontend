// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bestEnglishVoice, cancelEnglishWord, speakEnglishWord } from './wordSpeech'

class FakeUtterance {
  lang = ''
  rate = 1
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}

describe('English word playback', () => {
  const cancel = vi.fn()
  const speak = vi.fn()

  afterEach(() => {
    cancelEnglishWord()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('starts speech synchronously with an English utterance from a click', () => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { cancel, speak })

    expect(speakEnglishWord('hello')).toBe(true)
    expect(cancel).not.toHaveBeenCalled()
    expect(speak).toHaveBeenCalledOnce()
    expect(speak.mock.calls[0]![0]).toMatchObject({ text: 'hello', lang: 'en-US', rate: 0.85 })
  })

  it('replaces prior speech and reports a real playback error', () => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', { cancel, speak })
    const onError = vi.fn()

    speakEnglishWord('first', onError)
    const first = speak.mock.calls[0]![0] as FakeUtterance
    speakEnglishWord('second', onError)
    expect(cancel).toHaveBeenCalledOnce()
    first.onerror?.({ error: 'canceled' })
    expect(onError).not.toHaveBeenCalled()

    const second = speak.mock.calls[1]![0] as FakeUtterance
    second.onerror?.({ error: 'synthesis-failed' })
    expect(onError).toHaveBeenCalledWith('发音播放失败（synthesis-failed）')
  })

  it('returns false when the browser has no speech engine', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(speakEnglishWord('hello')).toBe(false)
  })

  it('prefers an installed English voice over a remote voice', () => {
    const remote = { lang: 'en-US', localService: false }
    const local = { lang: 'en-US', localService: true }
    expect(bestEnglishVoice({ getVoices: () => [remote, local] } as SpeechSynthesis)).toBe(local)
  })
})
