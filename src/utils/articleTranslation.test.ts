import { describe, expect, it } from 'vitest'
import { parseArticleTranslation } from './articleTranslation'

describe('parseArticleTranslation', () => {
  it('renders JSON heading and paragraph blocks without changing escaped text before parsing', () => {
    const stored = JSON.stringify({ blocks: [
      { type: 'heading', text: '第一章' },
      { type: 'paragraph', sentences: ['第一句。', '第二句\n续文。'] },
    ] })
    expect(parseArticleTranslation(stored)).toEqual(['第一章', '第一句。第二句\n续文。'])
  })

  it('renders legacy text with headings, paragraphs and sentence separators', () => {
    expect(parseArticleTranslation('## 标题\\n第一句。& 第二句。\n\n下一段。'))
      .toEqual(['标题', '第一句。第二句。', '下一段。'])
  })

  it('reports unsupported JSON structures', () => {
    expect(() => parseArticleTranslation('{"content":"文字"}')).toThrow('翻译内容格式错误')
  })
})
