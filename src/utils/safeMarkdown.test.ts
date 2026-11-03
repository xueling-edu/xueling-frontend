import { describe, expect, it } from 'vitest'
import { safeMarkdown } from './safeMarkdown'

describe('safeMarkdown', () => {
  it('keeps useful Markdown while dropping executable markup', () => {
    const html = safeMarkdown('## Words\n**bold** <font color="#c00">red</font><img src=x onerror=alert(1)><script>alert(2)</script>')
    expect(html).toContain('<h2>Words</h2>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<font color="#c00">red</font>')
    expect(html).not.toMatch(/<img|<script|onerror|alert/)
  })

  it('rejects event attributes, unsafe links, and embedded foreign content', () => {
    const html = safeMarkdown('<a href="javascript:alert(1)" onclick="alert(2)">bad</a> <a href="https://example.com">good</a><svg><a href="javascript:alert(3)">svg</a></svg><iframe srcdoc="<script>alert(4)</script>"></iframe>')
    expect(html).toContain('good</a>')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).not.toMatch(/javascript:|onclick|<svg|<iframe|alert/)
  })
})
