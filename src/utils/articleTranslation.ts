interface TranslationBlock {
  type: 'heading' | 'paragraph'
  text?: string
  sentences?: string[]
}

/** Convert the stored article translation into text aligned with article blocks. */
export function parseArticleTranslation(raw: string): string[] {
  const value = raw.trim()
  if (!value) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // Older articles and the admin editor also store plain text.
    return value.replace(/\\n/g, '\n').split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.startsWith('##') ? line.slice(2).trim() : line.split('&').map(part => part.trim()).join(''))
  }

  if (!parsed || typeof parsed !== 'object' || !('blocks' in parsed) || !Array.isArray(parsed.blocks)) {
    throw new Error('翻译内容格式错误')
  }

  return parsed.blocks.map((block: TranslationBlock) => {
    if (block?.type === 'heading') return typeof block.text === 'string' ? block.text : ''
    if (block?.type === 'paragraph') {
      if (Array.isArray(block.sentences)) return block.sentences.filter((sentence): sentence is string => typeof sentence === 'string').join('')
      return typeof block.text === 'string' ? block.text : ''
    }
    return ''
  })
}
