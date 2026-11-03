import { marked } from 'marked'

const allowed = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'CODE', 'PRE', 'BLOCKQUOTE', 'SPAN', 'FONT', 'A'])
const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'IMG'])

export function safeMarkdown(content: string): string {
  if (!content) return ''
  const source = document.createElement('template')
  source.innerHTML = marked.parse(content, { async: false }) as string
  const output = document.createElement('div')

  function appendSafe(node: Node, target: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent || ''))
      return
    }
    if (!(node instanceof Element) || blocked.has(node.tagName)) return
    if (!allowed.has(node.tagName)) {
      for (const child of Array.from(node.childNodes)) appendSafe(child, target)
      return
    }
    const clean = document.createElement(node.tagName.toLowerCase())
    if (node.tagName === 'A') {
      const href = node.getAttribute('href')?.trim()
      if (href && /^(https?:\/\/|mailto:)/i.test(href)) {
        clean.setAttribute('href', href)
        clean.setAttribute('rel', 'noopener noreferrer')
      }
    }
    if (node.tagName === 'FONT') {
      const color = node.getAttribute('color')?.trim() || ''
      if (/^(#[0-9a-f]{3,8}|[a-z]{1,20})$/i.test(color)) clean.setAttribute('color', color)
    }
    if (node.tagName === 'SPAN' && node.classList.contains('sentence-highlight')) clean.className = 'sentence-highlight'
    for (const child of Array.from(node.childNodes)) appendSafe(child, clean)
    target.appendChild(clean)
  }
  for (const child of Array.from(source.content.childNodes)) appendSafe(child, output)
  return output.innerHTML
}
