let activeUtterance: SpeechSynthesisUtterance | null = null

export function bestEnglishVoice(synthesis: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synthesis.getVoices?.() ?? []
  return voices.find(voice => voice.localService && voice.lang.toLowerCase() === 'en-us')
    ?? voices.find(voice => voice.localService && voice.lang.toLowerCase().startsWith('en'))
    ?? voices.find(voice => voice.lang.toLowerCase() === 'en-us')
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith('en'))
}

export function speechErrorMessage(error: string): string {
  switch (error) {
    case 'language-unavailable':
    case 'voice-unavailable':
      return '设备没有可用的英语语音，请安装英语语音包后重试'
    case 'synthesis-unavailable':
      return '浏览器没有可用的语音合成引擎'
    case 'audio-busy':
      return '音频设备正被其他应用占用，请稍后重试'
    case 'audio-hardware':
      return '浏览器没有检测到可用的音频输出设备'
    case 'network':
      return '语音服务网络连接失败，请检查网络后重试'
    default:
      return `发音播放失败（${error || '未知错误'}）`
  }
}

/** Call directly from a click handler so mobile browsers retain user activation. */
export function speakEnglishWord(word: string, onError?: (message: string) => void): boolean {
  if (!word.trim() || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return false

  try {
    if (activeUtterance || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel()
    }
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    const voice = bestEnglishVoice(window.speechSynthesis)
    if (voice) utterance.voice = voice
    activeUtterance = utterance
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null
    }
    utterance.onerror = event => {
      if (activeUtterance !== utterance) return
      activeUtterance = null
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        onError?.(speechErrorMessage(event.error))
      }
    }
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    activeUtterance = null
    return false
  }
}

export function cancelEnglishWord(): void {
  if (!activeUtterance) return
  activeUtterance = null
  window.speechSynthesis?.cancel()
}
