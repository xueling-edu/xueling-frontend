<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import SelectionWordLookup from '@/components/SelectionWordLookup.vue'
import TopicPicker from '@/features/vocab/components/TopicPicker.vue'
import { getStudyFamiliarity } from '@/features/vocab/api'
import type { FamiliarityStage, StudyFamiliarityWord } from '@/features/vocab/types'
import { createRequestId } from '@/utils/requestId'
import {
  generateContextArticle, getContextArticle, getContextAttemptHistory, listContextArticles, submitContextAttempt,
  type ContextArticle, type ContextArticleSummary, type ContextAttemptHistory, type ContextTarget
} from '@/features/vocab/contextArticle'

const router = useRouter()
const route = useRoute()
const words = ref<StudyFamiliarityWord[]>([])
const attention = ref<StudyFamiliarityWord[]>([])
const selected = ref<StudyFamiliarityWord[]>([])
const history = ref<ContextArticleSummary[]>([])
const article = ref<ContextArticle | null>(null)
const stage = ref<FamiliarityStage>('ALL')
const page = ref(1)
const totalPages = ref(1)
const topic = ref('')
const loadingWords = ref(false)
const generating = ref(false)
const loadingArticle = ref(false)
const submitting = ref(false)
const error = ref('')
const wordError = ref('')
const historyError = ref(false)
const answers = ref<string[]>(['', '', ''])
const score = ref<{ correctCount: number; totalCount: number } | null>(null)
const activeWord = ref<ContextTarget | null>(null)
const reader = ref<HTMLElement | null>(null)
const wordPrompt = ref('')
const phase = ref<'reading' | 'recall' | 'result'>('reading')
const peekArticle = ref(false)
const practiceWordIds = ref<string[]>([])
const attemptCount = ref(0)
const lastAttemptAt = ref('')
const resultRestored = ref(false)
const practice = ref<HTMLElement | null>(null)
let articleLoadToken = 0

const selectedIds = computed(() => new Set(selected.value.map(word => word.wordId)))
const canGenerate = computed(() => selected.value.length >= 5 && selected.value.length <= 8 && !generating.value)
const practiceTargets = computed(() => practiceWordIds.value
  .map(id => article.value?.targets.find(target => target.wordId === id))
  .filter((target): target is ContextTarget => !!target))
const remainingWords = computed(() => Math.max(0, 5 - selected.value.length))
const completedAnswers = computed(() => answers.value.slice(0, practiceTargets.value.length).filter(answer => answer.trim()).length)
const canSubmit = computed(() => practiceTargets.value.length > 0 && completedAnswers.value === practiceTargets.value.length && !submitting.value)
const answerCorrect = (index: number) => answers.value[index]?.trim().toLocaleLowerCase('en') === practiceTargets.value[index]?.word.toLocaleLowerCase('en')

const segments = computed(() => {
  if (!article.value) return []
  const text = article.value.content
  const occurrences = article.value.targets.flatMap(target => target.offsets.map(start => ({ start, end: start + target.word.length, target })))
    .sort((a, b) => a.start - b.start)
  const parts: { text: string; target?: ContextTarget }[] = []
  let cursor = 0
  for (const occurrence of occurrences) {
    if (occurrence.start < cursor || occurrence.end > text.length) continue
    if (occurrence.start > cursor) parts.push({ text: text.slice(cursor, occurrence.start) })
    parts.push({ text: text.slice(occurrence.start, occurrence.end), target: occurrence.target })
    cursor = occurrence.end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) })
  return parts
})

function cloze(target: ContextTarget): string {
  if (!article.value || !target.offsets.length) return ''
  const content = article.value.content
  const start = target.offsets[0]
  if (start === undefined) return ''
  const before = Math.max(content.lastIndexOf('.', start - 1), content.lastIndexOf('!', start - 1), content.lastIndexOf('?', start - 1)) + 1
  const afterCandidates = [content.indexOf('.', start), content.indexOf('!', start), content.indexOf('?', start)].filter(index => index >= 0)
  const after = afterCandidates.length ? Math.min(...afterCandidates) + 1 : content.length
  return `${content.slice(before, start).trimStart()}＿＿＿${content.slice(start + target.word.length, after)}`.trim()
}

function message(cause: unknown, fallback: string) {
  if (cause && typeof cause === 'object' && 'msg' in cause) return String(cause.msg)
  return fallback
}

async function loadWords() {
  loadingWords.value = true
  wordError.value = ''
  try {
    const response = await getStudyFamiliarity({ stage: stage.value, page: page.value })
    words.value = response.data.words ?? []
    attention.value = response.data.attentionWords ?? []
    totalPages.value = Math.max(1, Math.ceil(response.data.wordCount / response.data.pageSize))
  } catch (cause) {
    wordError.value = message(cause, '单词暂时无法加载，请稍后重试。')
  } finally {
    loadingWords.value = false
  }
}

async function loadHistory() {
  historyError.value = false
  try {
    history.value = (await listContextArticles()).data ?? []
  } catch {
    historyError.value = true
  }
}

function toggle(word: StudyFamiliarityWord) {
  if (selectedIds.value.has(word.wordId)) {
    selected.value = selected.value.filter(item => item.wordId !== word.wordId)
  } else if (selected.value.length < 8) {
    selected.value = [...selected.value, word]
  }
  wordPrompt.value = ''
}

function suggest() {
  const candidates = [...attention.value, ...words.value].filter(word => word.inStudyPlan)
  const unique = new Map(candidates.map(word => [word.wordId, word]))
  selected.value = [...unique.values()].slice(0, 6)
  wordPrompt.value = ''
}

function selectTarget(target: ContextTarget) {
  if (score.value) activeWord.value = target
  else wordPrompt.value = '完成填空后即可查看目标词释义。'
}

function backToArticle() {
  reader.value?.focus({ preventScroll: true })
  reader.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
}

function nextPracticeWordIds(current: ContextArticle, count: number): string[] {
  const total = current.targets.length
  return Array.from({ length: Math.min(3, total) }, (_, index) => current.targets[(count * 3 + index) % total]!.wordId)
}

function restoreArticle(current: ContextArticle, attempts: ContextAttemptHistory | null) {
  article.value = current
  attemptCount.value = attempts?.attemptCount ?? 0
  const latest = attempts?.latest
  const validIds = latest?.wordIds?.length === Math.min(3, current.targets.length) &&
    latest.answers?.length === latest.wordIds.length &&
    new Set(latest.wordIds).size === latest.wordIds.length &&
    latest.wordIds.every(id => current.targets.some(target => target.wordId === id))
  practiceWordIds.value = validIds ? latest!.wordIds : nextPracticeWordIds(current, attemptCount.value)
  answers.value = validIds ? [...latest!.answers] : ['', '', '']
  score.value = validIds ? { correctCount: latest!.correctCount, totalCount: latest!.totalCount } : null
  lastAttemptAt.value = validIds ? latest!.createTime : ''
  resultRestored.value = !!validIds
  phase.value = score.value ? 'result' : 'reading'
  peekArticle.value = false
  activeWord.value = null
  wordPrompt.value = ''
}

async function loadArticle(id: string) {
  const token = ++articleLoadToken
  loadingArticle.value = true
  error.value = ''
  try {
    const [articleResult, attemptsResult] = await Promise.allSettled([getContextArticle(id), getContextAttemptHistory(id)])
    if (token !== articleLoadToken) return
    if (articleResult.status === 'rejected') throw articleResult.reason
    restoreArticle(articleResult.value.data, attemptsResult.status === 'fulfilled' ? attemptsResult.value.data : null)
    if (attemptsResult.status === 'rejected') error.value = '文章已打开，但练习记录暂时无法读取。'
  } catch (cause) {
    article.value = null
    error.value = message(cause, '文章暂时无法读取。')
  } finally {
    if (token === articleLoadToken) loadingArticle.value = false
  }
}

function openArticle(id: string) {
  if (route.query.article !== id) void router.push({ query: { article: id } })
}

async function startRecall() {
  phase.value = 'recall'
  peekArticle.value = false
  await nextTick()
  practice.value?.scrollIntoView({ behavior: 'instant', block: 'start' })
}

function retryArticle() {
  if (!article.value) return
  practiceWordIds.value = nextPracticeWordIds(article.value, attemptCount.value)
  answers.value = ['', '', '']
  score.value = null
  resultRestored.value = false
  phase.value = 'reading'
  peekArticle.value = false
  activeWord.value = null
  wordPrompt.value = ''
  backToArticle()
}

async function generate() {
  if (!canGenerate.value) return
  generating.value = true
  error.value = ''
  try {
    const response = await generateContextArticle({
      requestId: createRequestId(),
      wordIds: selected.value.map(word => word.wordId),
      topic: topic.value || null
    })
    restoreArticle(response.data, null)
    await router.push({ query: { article: response.data.id } })
    void loadHistory()
  } catch (cause) {
    error.value = message(cause, '生成失败，请稍后重试。')
  } finally {
    generating.value = false
  }
}

async function submit() {
  if (!article.value || !canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    score.value = (await submitContextAttempt(article.value.id, practiceWordIds.value, answers.value.slice(0, practiceTargets.value.length))).data
    resultRestored.value = false
    attemptCount.value++
    lastAttemptAt.value = new Date().toLocaleDateString('sv-SE')
    phase.value = 'result'
    peekArticle.value = false
  } catch (cause) {
    error.value = message(cause, '练习结果暂时无法保存。')
  } finally {
    submitting.value = false
  }
}

async function newArticle() {
  await router.push({ query: {} })
}

function changeStage(value: FamiliarityStage) {
  stage.value = value
  page.value = 1
  void loadWords()
}

function changePage(value: number) {
  page.value = value
  void loadWords()
}

watch(() => route.query.article, id => {
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    if (article.value?.id !== id) void loadArticle(id)
    return
  }
  articleLoadToken++
  loadingArticle.value = false
  article.value = null
  score.value = null
  error.value = id ? '文章链接无效，请从练习记录中选择。' : ''
  void loadWords()
}, { immediate: true })

onMounted(() => {
  void loadHistory()
})
</script>

<template>
  <main class="context-page">
    <div class="context-shell xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '词汇语境练习' }]"
        title="让学过的词，进入一篇文章"
        description="选几个单词，读一篇为你生成的短文。随时练习，不影响今日打卡和复习安排。"
      ><template #mark>✦</template></PageHeading>

      <p v-if="error" class="error-note" role="alert">{{ error }}</p>
      <p v-if="!article && !loadingArticle && wordError" class="error-note" role="alert">{{ wordError }}</p>
      <div v-if="loadingArticle" class="state-note" role="status">正在打开文章…</div>

      <template v-else-if="article">
        <div class="reader-topline"><span>你的语境文章 · {{ article.targets.length }} 个目标词<span v-if="attemptCount"> · 已练 {{ attemptCount }} 次</span></span><button type="button" @click="newArticle">再选一组词 ↗</button></div>
        <div v-if="phase === 'recall'" class="recall-toolbar"><div><span class="eyebrow">02 / RECALL</span><h2>现在试着自己想起来</h2><p>想不起时可以查看原文，继续作答即可。</p></div><button type="button" :aria-expanded="peekArticle" @click="peekArticle = !peekArticle">{{ peekArticle ? '收起原文 ↑' : '查看原文提示 ↓' }}</button></div>
        <div v-if="phase !== 'recall' || peekArticle" class="reader-layout">
          <article ref="reader" class="reading-paper" tabindex="-1">
            <span class="eyebrow">READ IN CONTEXT</span>
            <h2>{{ article.title }}</h2>
            <p class="reading-guide">先读完短文，结合上下文猜词义。选中其他单词可以查义。</p>
            <SelectionWordLookup :protected-words="score ? [] : article.targets.map(target => target.word)">
              <p class="reading-content"><template v-for="(part, index) in segments" :key="index"><button v-if="part.target" type="button" class="target-word" :class="{ revealed: !!score }" :aria-label="score ? `查看 ${part.target.word} 的释义` : `${part.target.word}，提交练习后可查看释义`" @click="selectTarget(part.target)">{{ part.text }}</button><span v-else>{{ part.text }}</span></template></p>
            </SelectionWordLookup>
            <p v-if="activeWord" class="mobile-word-meaning" role="status"><strong>{{ activeWord.word }}</strong><span>{{ activeWord.meaning }}</span></p>
            <p v-else-if="wordPrompt" class="mobile-word-meaning" role="status">{{ wordPrompt }}</p>
            <p class="reading-hint">{{ score ? '点击标记的目标词，可核对含义。' : '目标词释义将在提交练习后揭晓。' }}</p>
          </article>
          <aside class="word-sidebar">
            <div class="sidebar-heading"><span class="eyebrow">WORD NOTES</span><h3>这篇文章里的词</h3></div>
            <p v-if="activeWord" class="active-meaning"><strong>{{ activeWord.word }}</strong><span>{{ activeWord.meaning }}</span></p>
            <p v-else class="sidebar-instruction" role="status">{{ wordPrompt || (score ? '点击文章中的目标词核对含义。' : '先试着根据上下文理解；完成练习后揭晓释义。') }}</p>
            <ol><li v-for="(target, index) in article.targets" :key="target.wordId"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ target.word }}</strong></li></ol>
          </aside>
        </div>
        <details v-if="phase !== 'recall'" class="mobile-word-list"><summary>查看本篇 {{ article.targets.length }} 个目标词</summary><ol><li v-for="target in article.targets" :key="target.wordId">{{ target.word }}</li></ol></details>
        <section v-if="phase === 'reading'" class="reading-next"><div><span class="eyebrow">02 / RECALL</span><h2>读完了？试着从语境中找回单词</h2><p>开始后会收起原文。本轮练习 {{ practiceTargets.length }} / {{ article.targets.length }} 个目标词，随时可以展开原文作为提示。</p></div><button type="button" @click="startRecall">开始回忆 ↗</button></section>
        <section v-if="phase !== 'reading'" ref="practice" class="practice-panel" aria-labelledby="practice-title">
          <div class="practice-intro"><span class="eyebrow">RECALL / 回忆</span><h2 id="practice-title">读完后，试着填回这些词</h2><p>根据原文语境填写英文单词。结果只属于这次练习。</p><span v-if="!score" class="practice-progress" role="status">已完成 {{ completedAnswers }} / {{ practiceTargets.length }}</span></div>
          <div class="practice-list"><label v-for="(target, index) in practiceTargets" :key="target.wordId" class="practice-item" :class="{ 'answer-right': score && answerCorrect(index), 'answer-wrong': score && !answerCorrect(index) }"><span class="practice-number">{{ String(index + 1).padStart(2, '0') }}</span><span class="practice-sentence">{{ cloze(target) }}</span><span class="answer-row"><input v-model="answers[index]" :disabled="!!score" :aria-label="`第 ${index + 1} 题答案`" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="填入单词" /><small v-if="score" class="answer-feedback">{{ answerCorrect(index) ? '回答正确' : `正确答案：${target.word}` }}</small></span></label></div>
          <div class="practice-footer"><p v-if="score" role="status"><strong>{{ resultRestored ? '最近一次' : '本次' }}答对 {{ score.correctCount }} / {{ score.totalCount }} 题</strong><span>{{ lastAttemptAt ? `完成于 ${lastAttemptAt.slice(0, 10)}` : '练习已保存' }} · 不改变复习安排</span></p><template v-if="score"><button type="button" class="review-button" @click="backToArticle">返回文章核对 ↑</button><button type="button" @click="retryArticle">再练一次 ↗</button></template><button v-else type="button" :disabled="!canSubmit" @click="submit">{{ submitting ? '正在保存…' : '查看练习结果' }}</button></div>
        </section>
      </template>

      <template v-else>
        <div class="compose-grid">
          <section class="compose-panel" aria-labelledby="select-title">
            <div class="section-heading"><span class="eyebrow">01 / CHOOSE WORDS</span><h2 id="select-title">选择 5–8 个已学单词</h2><p>先从需要关注的词开始，也可以浏览你学过的其他词。</p></div>
            <div class="selection-caption"><strong>本次目标词</strong><span role="status">{{ remainingWords ? `再选 ${remainingWords} 个即可生成` : selected.length === 8 ? '已选满 8 个' : '可以生成文章了' }}</span></div>
            <div class="selection-tray"><span v-if="!selected.length" class="empty-selection">你选的词会出现在这里</span><TransitionGroup name="chip" tag="div" class="chip-list"><button v-for="word in selected" :key="word.wordId" type="button" class="selected-chip" :aria-label="`移除 ${word.word}`" @click="toggle(word)">{{ word.word }} <span aria-hidden="true">×</span></button></TransitionGroup><strong>{{ selected.length }} / 8</strong></div>
            <div v-if="attention.length" class="attention-strip"><div><strong>值得再看一眼</strong><span>优先选择近期忘记过的词</span></div><button type="button" @click="suggest">帮我选一组</button></div>
            <div class="filter-row" role="group" aria-label="筛选已学单词"><button v-for="option in [{ key: 'ALL', label: '全部' }, { key: 'LEARNING', label: '初学' }, { key: 'CONSOLIDATING', label: '巩固中' }, { key: 'STABLE', label: '较稳固' }]" :key="option.key" type="button" :class="{ active: stage === option.key }" @click="changeStage(option.key as FamiliarityStage)">{{ option.label }}</button></div>
            <p v-if="loadingWords" class="state-note" role="status">正在整理已学单词…</p>
            <p v-else-if="!words.length" class="state-note">这里还没有已学单词。先完成一些单词学习，再来生成文章。</p>
            <ul v-else class="available-words"><li v-for="word in words" :key="word.wordId"><button type="button" :class="{ chosen: selectedIds.has(word.wordId) }" :aria-pressed="selectedIds.has(word.wordId)" :disabled="!selectedIds.has(word.wordId) && selected.length >= 8" @click="toggle(word)"><span class="check-mark">{{ selectedIds.has(word.wordId) ? '✓' : '+' }}</span><span class="word-copy"><strong>{{ word.word }}</strong><small>{{ word.meaning }}</small></span><em>{{ word.due ? '待复习' : word.stage === 'LEARNING' ? '初学' : word.stage === 'STABLE' ? '较稳固' : '巩固中' }}</em></button></li></ul>
            <div class="pager"><button type="button" :disabled="page <= 1 || loadingWords" @click="changePage(page - 1)">上一页</button><span>{{ page }} / {{ totalPages }}</span><button type="button" :disabled="page >= totalPages || loadingWords" @click="changePage(page + 1)">下一页</button></div>
            <p v-if="selected.length === 8" class="limit-note">已选满 8 个；移除一个词后可以继续挑选。</p>
          </section>
          <aside class="generate-panel">
            <span class="eyebrow">02 / CREATE</span>
            <h2>让单词有上下文</h2>
            <p>一篇约 120–180 词的英文短文，让这些词在自然语境里出现。</p>
            <TopicPicker v-model="topic" />
            <div class="generate-preview"><span>本次目标词</span><strong>{{ selected.length }} / 8</strong></div>
            <p class="generate-readiness">{{ remainingWords ? `再选 ${remainingWords} 个词，就能开始生成` : '词汇已备好，可以生成文章' }}</p>
            <button type="button" class="generate-button" :disabled="!canGenerate" @click="generate">{{ generating ? '正在写文章…' : '生成我的文章 ↗' }}</button>
            <div v-if="generating" class="generating-state" role="status"><span class="generating-icon" aria-hidden="true">✦</span><div><strong>正在组织自然语境</strong><span>请稍候，完成后会自动打开文章。</span></div></div>
            <p class="generate-note">文章会保存在你的练习记录中。</p>
          </aside>
        </div>
        <div class="mobile-generate-bar"><span>{{ remainingWords ? `还需 ${remainingWords} 个词` : `已选 ${selected.length} 个词` }}</span><button type="button" :disabled="!canGenerate" @click="generate">{{ generating ? '正在生成…' : '生成文章 ↗' }}</button></div>
      </template>

      <section class="history-panel" aria-labelledby="history-title"><div class="history-heading"><span class="eyebrow">YOUR LIBRARY</span><h2 id="history-title">我的语境文章</h2></div><p v-if="historyError" class="history-empty" role="status">练习记录暂时无法加载。<button type="button" class="history-retry" @click="loadHistory">重试</button></p><p v-else-if="!history.length" class="history-empty">生成第一篇文章后，它会出现在这里。</p><div v-else class="history-list"><button v-for="item in history" :key="item.id" type="button" @click="openArticle(item.id)"><span>{{ item.createTime?.slice(0, 10) }}</span><strong>{{ item.title }}</strong><small>{{ item.wordCount }} 个目标词{{ item.topic ? ` · ${item.topic}` : '' }}</small><i aria-hidden="true">↗</i></button></div></section>
    </div>
  </main>
</template>

<style scoped>
.context-page{min-height:100vh;background:var(--xl-bg);color:var(--xl-ink)}.context-shell{padding-bottom:90px}.eyebrow{font:750 11px/1.4 var(--xl-font-body);letter-spacing:.18em;color:#698473}.error-note{padding:14px 18px;border:1px solid #e8c1b4;border-radius:10px;background:#fff0ea;color:#963d2f;margin-bottom:18px}.state-note{padding:20px;color:var(--xl-ink-soft)}.compose-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(290px,.85fr);gap:24px;align-items:start}.compose-panel,.generate-panel,.reading-paper,.word-sidebar,.practice-panel,.history-panel{border:1px solid var(--xl-border);border-radius:var(--xl-radius-lg);background:var(--xl-surface);box-shadow:0 16px 38px rgba(25,57,36,.035)}.compose-panel{padding:30px}.section-heading h2,.history-heading h2,.practice-intro h2{font:700 clamp(22px,2.5vw,29px)/1.3 var(--xl-font-display);margin:9px 0 6px}.section-heading p,.practice-intro p{font-size:13px;color:var(--xl-ink-soft);margin:0 0 23px}.selection-tray{min-height:66px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px;border:1px dashed #b9cdb9;border-radius:12px;background:#f4f8f0}.selection-tray>strong{margin-left:auto;color:#547057;font-size:12px}.empty-selection{font-size:13px;color:#8a9b8b}.selected-chip{border:0;border-radius:20px;background:#dcebdc;color:#254d34;padding:7px 10px;font-weight:700;cursor:pointer}.selected-chip span{margin-left:6px}.attention-strip{margin:22px 0;display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:12px;padding:15px 17px;background:#eef1e3}.attention-strip div{display:flex;flex-direction:column;gap:3px}.attention-strip strong{font-size:13px}.attention-strip span{font-size:11px;color:#6c796c}.attention-strip button{border:1px solid #8baa89;border-radius:7px;background:#fff;color:#31573b;padding:8px 12px;white-space:nowrap;cursor:pointer}.filter-row{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.filter-row button{border:1px solid #d8e2d6;border-radius:20px;background:#fff;padding:7px 15px;color:#647669;cursor:pointer}.filter-row button.active{background:#28533b;border-color:#28533b;color:#fff}.available-words{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.available-words li button{width:100%;min-height:70px;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #e0e7dd;border-radius:10px;background:#fff;padding:10px 12px;cursor:pointer}.available-words li button:hover,.available-words li button.chosen{border-color:#78a17e;background:#f3f8f1}.available-words li button:disabled{opacity:.55;cursor:default}.check-mark{width:24px;height:24px;display:grid;place-items:center;border:1px solid #bdd0bf;border-radius:50%;color:#336b46;flex:none}.word-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.word-copy strong{font-size:15px}.word-copy small{font-size:11px;color:#738075;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.available-words em{font-size:10px;color:#748475;font-style:normal}.pager{display:flex;justify-content:center;align-items:center;gap:15px;margin-top:20px;font-size:12px}.pager button{border:0;background:none;color:#315f40;cursor:pointer}.pager button:disabled{opacity:.4}.generate-panel{padding:30px;position:sticky;top:20px;background:#eaf1e6}.generate-panel h2{font:700 clamp(24px,2.5vw,31px)/1.2 var(--xl-font-display);margin:16px 0 10px}.generate-panel>p{color:#5b705e;line-height:1.7;font-size:13px}.generate-panel label{display:block;font-weight:700;font-size:13px;margin:32px 0 9px}.generate-panel label small{font-weight:400;color:#708373}.generate-panel input,.practice-item input{box-sizing:border-box;width:100%;border:1px solid #b9cdb9;border-radius:9px;background:#fff;padding:12px 13px;font:inherit;outline-color:#497953}.generate-preview{display:flex;justify-content:space-between;margin:24px 0;border-top:1px solid #c9d9c6;padding-top:19px;font-size:13px}.generate-button,.practice-footer button{width:100%;border:0;border-radius:10px;background:#28533b;color:#fff;min-height:48px;font-weight:750;cursor:pointer}.generate-button:disabled,.practice-footer button:disabled{opacity:.55;cursor:default}.generate-panel .generate-note{font-size:11px;text-align:center;margin:12px 0 0}.reader-topline{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;font-size:12px;color:#6d806e}.reader-topline button{border:0;background:none;color:#2e6240;font-weight:700;cursor:pointer}.reader-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.65fr);gap:24px;align-items:start}.reading-paper{padding:clamp(28px,5vw,62px);background:#fffefa}.reading-paper h2{font:700 clamp(29px,3vw,42px)/1.2 var(--xl-font-display);margin:18px 0 30px}.reading-content{white-space:pre-wrap;font:400 clamp(18px,2vw,21px)/1.9 Georgia,serif;color:#2d3930}.target-word{border:0;border-bottom:2px solid #91b391;padding-inline:1px;background:#e9f4e7;color:#214d31;font:inherit;cursor:pointer}.reading-hint{border-top:1px solid #e2e9dd;padding-top:20px;color:#738276;font-size:12px}.word-sidebar{padding:26px;position:sticky;top:20px}.word-sidebar h3{font:700 22px var(--xl-font-display);margin:10px 0 22px}.active-meaning{display:flex;flex-direction:column;gap:8px;border-radius:9px;background:#e9f3e6;padding:16px;color:#31543a}.active-meaning strong{font:700 22px Georgia,serif}.active-meaning span,.sidebar-instruction{font-size:12px;line-height:1.65}.word-sidebar ol{padding:0;margin:20px 0 0;list-style:none}.word-sidebar li{display:flex;gap:15px;padding:10px 0;border-bottom:1px solid #edf0eb}.word-sidebar li span{color:#9aaa9c;font-size:11px}.word-sidebar li strong{font:600 16px Georgia,serif}.practice-panel{margin-top:24px;padding:30px}.practice-list{display:grid;gap:12px}.practice-item{display:grid;grid-template-columns:36px minmax(0,1fr) 170px;gap:15px;align-items:center;padding:14px;background:#f7f9f4;border-radius:10px}.practice-number{font-size:12px;color:#7c9980}.practice-sentence{font:16px/1.5 Georgia,serif}.practice-item small{grid-column:2/-1;color:#3d704b}.practice-footer{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin-top:20px}.practice-footer p{margin:0;color:#315a3c}.practice-footer button{width:auto;padding:0 23px}.history-panel{margin-top:32px;padding:28px}.history-heading h2{margin-bottom:22px}.history-empty{font-size:13px;color:var(--xl-ink-soft)}.history-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.history-list button{display:grid;grid-template-columns:1fr auto;gap:6px;text-align:left;border:1px solid #e0e7dc;border-radius:10px;background:#fff;padding:16px;cursor:pointer}.history-list button:hover{border-color:#88a98a}.history-list span,.history-list small{font-size:11px;color:#78907b}.history-list strong{font:700 18px var(--xl-font-display);grid-column:1}.history-list small{grid-column:1}.history-list i{grid-column:2;grid-row:1/4;align-self:center;color:#477a51;font-style:normal}@media(max-width:860px){.compose-grid,.reader-layout{grid-template-columns:1fr}.generate-panel,.word-sidebar{position:static}.history-list{grid-template-columns:1fr}}@media(max-width:600px){.compose-panel,.generate-panel,.practice-panel,.history-panel{padding:20px}.available-words{grid-template-columns:1fr}.practice-item{grid-template-columns:30px 1fr}.practice-item input{grid-column:2}.practice-item small{grid-column:2}.reader-topline{gap:12px}.practice-footer{display:block}.practice-footer button{margin-top:14px;width:100%}}
</style>

<style scoped>
.selection-caption{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 9px;font-size:12px;color:var(--xl-ink-soft)}
.selection-caption strong{color:var(--xl-ink);font-size:13px}
.selection-caption span{color:var(--xl-brand);font-weight:700}
.selection-tray{align-items:center}
.chip-list{display:flex;flex:1;flex-wrap:wrap;gap:8px;min-width:0}
.selected-chip{transition:background-color .16s,transform .16s}
.selected-chip:hover{background:#cce2cb;transform:translateY(-1px)}
.chip-enter-active,.chip-leave-active{transition:opacity .18s,transform .18s}
.chip-enter-from,.chip-leave-to{opacity:0;transform:translateY(7px) scale(.96)}
.limit-note{margin:12px 0 0;color:#6a796a;font-size:12px}
.history-retry{margin-left:8px;padding:3px 5px;border:0;background:transparent;color:var(--xl-brand);font-weight:750;text-decoration:underline;cursor:pointer}
.generate-readiness{margin:-10px 0 16px!important;color:var(--xl-brand)!important;font-weight:700}
.generate-button:not(:disabled),.practice-footer button:not(:disabled){transition:background-color .18s,transform .18s,box-shadow .18s}
.generate-button:not(:disabled):hover,.practice-footer button:not(:disabled):hover{background:var(--xl-brand-hover);transform:translateY(-2px);box-shadow:var(--xl-button-shadow-hover)}
.generating-state{display:flex;align-items:center;gap:12px;margin-top:15px;padding:13px;border:1px solid #cbdcc7;border-radius:11px;background:#f7faf4}
.generating-state div{display:flex;flex-direction:column;gap:3px}
.generating-state strong{font-size:12px;color:var(--xl-brand)}
.generating-state div span{font-size:11px;line-height:1.5;color:var(--xl-ink-soft)}
.generating-icon{flex:none;width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:#e3efdf;color:var(--xl-brand);animation:generating-pulse 1.8s ease-in-out infinite}
@keyframes generating-pulse{50%{transform:scale(1.08);opacity:.6}}
.mobile-generate-bar{display:none}
.reading-paper{scroll-margin-top:22px}
.reading-paper:focus{outline:none}
.reading-paper h2{margin-bottom:15px}
.reading-guide{margin:0 0 28px;padding-bottom:21px;border-bottom:1px solid #e5eadf;color:#6e7d70;font-size:13px;line-height:1.65}
.reading-content{max-width:66ch;margin:0 auto 30px;font-size:clamp(18px,1.75vw,21px);line-height:1.95;white-space:pre-wrap}
.target-word{border-radius:3px 3px 0 0;transition:background-color .18s,border-color .18s}
.target-word:hover,.target-word:focus-visible{background:#dcefd8}
.target-word.revealed{border-bottom-color:#396f48}
.mobile-word-meaning{display:none}
.mobile-word-list{display:none}
.reading-next,.recall-toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:24px;padding:25px 30px;border:1px solid #cbdcc7;border-radius:var(--xl-radius-lg);background:#eaf1e6}
.reading-next h2,.recall-toolbar h2{margin:8px 0 6px;font:700 clamp(21px,2.4vw,26px)/1.3 var(--xl-font-display)}
.reading-next p,.recall-toolbar p{margin:0;color:var(--xl-ink-soft);font-size:13px;line-height:1.65}
.reading-next button,.recall-toolbar button{flex:none;min-height:46px;padding:0 18px;border:1px solid var(--xl-brand);border-radius:10px;background:var(--xl-brand);color:#fff;font-weight:750;cursor:pointer}
.recall-toolbar{margin-top:0;background:#f3f7f0}
.recall-toolbar button{background:#fffefa;color:var(--xl-brand)}
.recall-toolbar button:hover{background:#e8f1e4}
.practice-panel{scroll-margin-top:22px}
.word-sidebar{background:#fcfdf8}
.practice-intro{position:relative;padding-right:100px}
.practice-progress{position:absolute;right:0;top:4px;padding:7px 11px;border-radius:20px;background:#e9f2e5;color:var(--xl-brand);font-size:12px;font-weight:750}
.practice-list{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
.practice-item{display:flex;flex-direction:column;align-items:stretch;gap:13px;min-height:225px;padding:20px;border:1px solid #e2e9dd}
.practice-number{color:#477755;font-weight:800;letter-spacing:.1em}
.practice-sentence{flex:1;line-height:1.65}
.answer-row{display:flex;flex-direction:column;gap:8px}
.practice-item input{min-height:46px}
.practice-item input:disabled{background:#fff;color:var(--xl-ink);opacity:1}
.practice-item.answer-right{border-color:#a9cbaa;background:#f1f8ef}
.practice-item.answer-wrong{border-color:#d9ba9b;background:#fff8ee}
.answer-feedback{font-size:12px;font-weight:700}
.answer-right .answer-feedback{color:#316b42}
.answer-wrong .answer-feedback{color:#916026}
.practice-footer p{display:flex;flex-direction:column;gap:5px}
.practice-footer{flex-wrap:wrap}
.practice-footer p strong{font-size:16px}
.practice-footer p span{font-size:12px;color:var(--xl-ink-soft)}
.practice-footer .review-button{border:1px solid #9db89f;background:#f4f8f1;color:var(--xl-brand)}
.practice-footer .review-button:hover{background:#eaf2e6!important;box-shadow:none!important}
@media(max-width:860px){.practice-list{grid-template-columns:1fr}.practice-item{min-height:0}.practice-sentence{flex:auto}.word-sidebar{display:none}.mobile-word-meaning{display:flex;flex-direction:column;gap:5px;padding:13px 15px;border-radius:10px;background:#e9f3e6;color:var(--xl-brand);font-size:12px;line-height:1.6}.mobile-word-meaning strong{font:700 19px Georgia,serif}.mobile-word-list{display:block;margin-top:14px;padding:13px 18px;border:1px solid var(--xl-border);border-radius:12px;background:#fffefa;color:var(--xl-brand);font-size:13px}.mobile-word-list summary{cursor:pointer;font-weight:700}.mobile-word-list ol{display:flex;flex-wrap:wrap;gap:8px;margin:13px 0 0;padding:0;list-style:none}.mobile-word-list li{padding:5px 9px;border-radius:20px;background:#eef4eb;font:600 13px Georgia,serif}}
@media(max-width:600px){.reading-next,.recall-toolbar{align-items:stretch;flex-direction:column;padding:21px}.reading-next button,.recall-toolbar button{width:100%}.practice-footer{align-items:stretch;flex-direction:column}.practice-footer button{margin-top:0!important;width:100%}}
@media(max-width:600px){.context-shell{padding-bottom:130px}.compose-panel,.generate-panel,.practice-panel,.history-panel{padding:20px}.selection-caption{align-items:start}.selection-caption span{text-align:right}.generate-panel .generate-button{display:none}.mobile-generate-bar{position:fixed;z-index:20;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px max(16px,env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));border-top:1px solid #cddbc9;background:#fffefaf5;box-shadow:0 -10px 28px rgba(26,52,32,.09);backdrop-filter:blur(12px)}.mobile-generate-bar span{font-size:12px;color:var(--xl-brand);font-weight:750}.mobile-generate-bar button{min-width:145px;min-height:46px;border:0;border-radius:10px;background:var(--xl-brand);color:#fff;font-weight:750}.mobile-generate-bar button:disabled{opacity:.5}.reading-paper{padding:26px 22px}.reading-paper h2{font-size:29px}.reading-content{font-size:18px;line-height:1.85}.mobile-word-meaning{display:flex;flex-direction:column;gap:5px;padding:13px 15px;border-radius:10px;background:#e9f3e6;color:var(--xl-brand);font-size:12px;line-height:1.6}.mobile-word-meaning strong{font:700 19px Georgia,serif}.practice-intro{padding-right:0}.practice-progress{position:static;display:inline-flex;margin:0 0 17px}.practice-item{padding:17px}.practice-item input{grid-column:auto}.practice-footer .review-button{width:100%}}
@media(prefers-reduced-motion:reduce){.selected-chip,.chip-enter-active,.chip-leave-active,.generate-button,.practice-footer button,.target-word{transition:none!important}.generating-icon{animation:none}}
</style>
