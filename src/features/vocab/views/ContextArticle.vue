<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeading from '@/components/PageHeading.vue'
import SelectionWordLookup from '@/components/SelectionWordLookup.vue'
import TopicPicker from '@/features/vocab/components/TopicPicker.vue'
import { getStudyFamiliarity } from '@/features/vocab/api'
import type { FamiliarityStage, StudyFamiliarityWord } from '@/features/vocab/types'
import { createRequestId } from '@/utils/requestId'
import {
  generateContextArticle, getContextArticle, listContextArticles, submitContextAttempt,
  type ContextArticle, type ContextArticleSummary, type ContextTarget
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
const answers = ref<string[]>(['', '', ''])
const score = ref<{ correctCount: number; totalCount: number } | null>(null)
const activeWord = ref<ContextTarget | null>(null)

const selectedIds = computed(() => new Set(selected.value.map(word => word.wordId)))
const canGenerate = computed(() => selected.value.length >= 5 && selected.value.length <= 8 && !generating.value)
const practiceTargets = computed(() => article.value?.targets.slice(0, 3) ?? [])

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
  error.value = ''
  try {
    const response = await getStudyFamiliarity({ stage: stage.value, page: page.value })
    words.value = response.data.words ?? []
    attention.value = response.data.attentionWords ?? []
    totalPages.value = Math.max(1, Math.ceil(response.data.wordCount / response.data.pageSize))
  } catch (cause) {
    error.value = message(cause, '单词暂时无法加载，请稍后重试。')
  } finally {
    loadingWords.value = false
  }
}

function toggle(word: StudyFamiliarityWord) {
  if (selectedIds.value.has(word.wordId)) {
    selected.value = selected.value.filter(item => item.wordId !== word.wordId)
  } else if (selected.value.length < 8) {
    selected.value = [...selected.value, word]
  }
}

function suggest() {
  const candidates = [...attention.value, ...words.value].filter(word => word.inStudyPlan)
  const unique = new Map(candidates.map(word => [word.wordId, word]))
  selected.value = [...unique.values()].slice(0, 6)
}

async function openArticle(id: string) {
  loadingArticle.value = true
  error.value = ''
  try {
    article.value = (await getContextArticle(id)).data
    answers.value = ['', '', '']
    score.value = null
    activeWord.value = null
    await router.replace({ query: { article: id } })
  } catch (cause) {
    error.value = message(cause, '文章暂时无法读取。')
  } finally {
    loadingArticle.value = false
  }
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
    article.value = response.data
    answers.value = ['', '', '']
    score.value = null
    activeWord.value = null
    await router.replace({ query: { article: response.data.id } })
    history.value = (await listContextArticles()).data ?? []
  } catch (cause) {
    error.value = message(cause, '生成失败，请稍后重试。')
  } finally {
    generating.value = false
  }
}

async function submit() {
  if (!article.value || answers.value.slice(0, practiceTargets.value.length).some(answer => !answer.trim())) return
  submitting.value = true
  error.value = ''
  try {
    score.value = (await submitContextAttempt(article.value.id, answers.value.slice(0, practiceTargets.value.length))).data
  } catch (cause) {
    error.value = message(cause, '练习结果暂时无法保存。')
  } finally {
    submitting.value = false
  }
}

async function newArticle() {
  article.value = null
  score.value = null
  error.value = ''
  await router.replace({ query: {} })
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

onMounted(async () => {
  await Promise.all([loadWords(), listContextArticles().then(response => { history.value = response.data ?? [] }).catch(() => {})])
  const id = route.query.article
  if (typeof id === 'string' && /^\d+$/.test(id)) await openArticle(id)
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
      <div v-if="loadingArticle" class="state-note" role="status">正在打开文章…</div>

      <template v-else-if="article">
        <div class="reader-topline"><span>你的语境文章 · {{ article.targets.length }} 个目标词</span><button type="button" @click="newArticle">再选一组词 ↗</button></div>
        <div class="reader-layout">
          <article class="reading-paper">
            <span class="eyebrow">READ IN CONTEXT</span>
            <h2>{{ article.title }}</h2>
            <SelectionWordLookup :protected-words="score ? [] : article.targets.map(target => target.word)">
              <p class="reading-content"><template v-for="(part, index) in segments" :key="index"><button v-if="part.target" type="button" class="target-word" @click="score && (activeWord = part.target)">{{ part.text }}</button><span v-else>{{ part.text }}</span></template></p>
            </SelectionWordLookup>
            <p class="reading-hint">选中其他单词可直接查义；提交练习后可点击目标词核对含义。</p>
          </article>
          <aside class="word-sidebar">
            <div class="sidebar-heading"><span class="eyebrow">WORD NOTES</span><h3>这篇文章里的词</h3></div>
            <p v-if="activeWord" class="active-meaning"><strong>{{ activeWord.word }}</strong><span>{{ activeWord.meaning }}</span></p>
            <p v-else class="sidebar-instruction">先试着根据上下文理解，再点词核对。</p>
            <ol><li v-for="(target, index) in article.targets" :key="target.wordId"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ target.word }}</strong></li></ol>
          </aside>
        </div>
        <section class="practice-panel" aria-labelledby="practice-title">
          <div class="practice-intro"><span class="eyebrow">RECALL / 回忆</span><h2 id="practice-title">读完后，试着填回这些词</h2><p>根据原文语境填写英文单词。结果只属于这次练习。</p></div>
          <div class="practice-list"><label v-for="(target, index) in practiceTargets" :key="target.wordId" class="practice-item"><span class="practice-number">0{{ index + 1 }}</span><span class="practice-sentence">{{ cloze(target) }}</span><input v-model="answers[index]" :disabled="!!score" :aria-label="`第 ${index + 1} 题答案`" autocomplete="off" placeholder="填入单词" /><small v-if="score">答案：{{ target.word }}</small></label></div>
          <div class="practice-footer"><p v-if="score" role="status">本次答对 {{ score.correctCount }} / {{ score.totalCount }} 题。之后仍要按计划复习这些词。</p><button v-else type="button" :disabled="submitting || answers.slice(0, practiceTargets.length).some(answer => !answer.trim())" @click="submit">{{ submitting ? '正在保存…' : '查看练习结果' }}</button></div>
        </section>
      </template>

      <template v-else>
        <div class="compose-grid">
          <section class="compose-panel" aria-labelledby="select-title">
            <div class="section-heading"><span class="eyebrow">01 / CHOOSE WORDS</span><h2 id="select-title">选择 5–8 个已学单词</h2><p>先从需要关注的词开始，也可以浏览你学过的其他词。</p></div>
            <div class="selection-tray"><span v-if="!selected.length" class="empty-selection">你选的词会出现在这里</span><button v-for="word in selected" :key="word.wordId" type="button" class="selected-chip" :aria-label="`移除 ${word.word}`" @click="toggle(word)">{{ word.word }} <span aria-hidden="true">×</span></button><strong>{{ selected.length }} / 8</strong></div>
            <div v-if="attention.length" class="attention-strip"><div><strong>值得再看一眼</strong><span>优先选择近期忘记过的词</span></div><button type="button" @click="suggest">帮我选一组</button></div>
            <div class="filter-row" role="group" aria-label="筛选已学单词"><button v-for="option in [{ key: 'ALL', label: '全部' }, { key: 'LEARNING', label: '初学' }, { key: 'CONSOLIDATING', label: '巩固中' }, { key: 'STABLE', label: '较稳固' }]" :key="option.key" type="button" :class="{ active: stage === option.key }" @click="changeStage(option.key as FamiliarityStage)">{{ option.label }}</button></div>
            <p v-if="loadingWords" class="state-note" role="status">正在整理已学单词…</p>
            <p v-else-if="!words.length" class="state-note">这里还没有已学单词。先完成一些单词学习，再来生成文章。</p>
            <ul v-else class="available-words"><li v-for="word in words" :key="word.wordId"><button type="button" :class="{ chosen: selectedIds.has(word.wordId) }" :aria-pressed="selectedIds.has(word.wordId)" :disabled="!selectedIds.has(word.wordId) && selected.length >= 8" @click="toggle(word)"><span class="check-mark">{{ selectedIds.has(word.wordId) ? '✓' : '+' }}</span><span class="word-copy"><strong>{{ word.word }}</strong><small>{{ word.meaning }}</small></span><em>{{ word.due ? '待复习' : word.stage === 'LEARNING' ? '初学' : word.stage === 'STABLE' ? '较稳固' : '巩固中' }}</em></button></li></ul>
            <div class="pager"><button type="button" :disabled="page <= 1 || loadingWords" @click="changePage(page - 1)">上一页</button><span>{{ page }} / {{ totalPages }}</span><button type="button" :disabled="page >= totalPages || loadingWords" @click="changePage(page + 1)">下一页</button></div>
          </section>
          <aside class="generate-panel">
            <span class="eyebrow">02 / CREATE</span>
            <h2>让单词有上下文</h2>
            <p>一篇约 120–180 词的英文短文，让这些词在自然语境里出现。</p>
            <TopicPicker v-model="topic" />
            <div class="generate-preview"><span>本次目标词</span><strong>{{ selected.length }} 个</strong></div>
            <button type="button" class="generate-button" :disabled="!canGenerate" @click="generate">{{ generating ? '正在写文章…' : '生成我的文章 ↗' }}</button>
            <p class="generate-note">生成可能需要一些时间。文章会保存在你的练习记录中。</p>
          </aside>
        </div>
      </template>

      <section class="history-panel" aria-labelledby="history-title"><div class="history-heading"><span class="eyebrow">YOUR LIBRARY</span><h2 id="history-title">我的语境文章</h2></div><p v-if="!history.length" class="history-empty">生成第一篇文章后，它会出现在这里。</p><div v-else class="history-list"><button v-for="item in history" :key="item.id" type="button" @click="openArticle(item.id)"><span>{{ item.createTime?.slice(0, 10) }}</span><strong>{{ item.title }}</strong><small>{{ item.wordCount }} 个词{{ item.topic ? ` · ${item.topic}` : '' }}</small><i aria-hidden="true">↗</i></button></div></section>
    </div>
  </main>
</template>

<style scoped>
.context-page{min-height:100vh;background:var(--xl-bg);color:var(--xl-ink)}.context-shell{padding-bottom:90px}.eyebrow{font:750 11px/1.4 var(--xl-font-body);letter-spacing:.18em;color:#698473}.error-note{padding:14px 18px;border:1px solid #e8c1b4;border-radius:10px;background:#fff0ea;color:#963d2f;margin-bottom:18px}.state-note{padding:20px;color:var(--xl-ink-soft)}.compose-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(290px,.85fr);gap:24px;align-items:start}.compose-panel,.generate-panel,.reading-paper,.word-sidebar,.practice-panel,.history-panel{border:1px solid var(--xl-border);border-radius:var(--xl-radius-lg);background:var(--xl-surface);box-shadow:0 16px 38px rgba(25,57,36,.035)}.compose-panel{padding:30px}.section-heading h2,.history-heading h2,.practice-intro h2{font:700 clamp(22px,2.5vw,29px)/1.3 var(--xl-font-display);margin:9px 0 6px}.section-heading p,.practice-intro p{font-size:13px;color:var(--xl-ink-soft);margin:0 0 23px}.selection-tray{min-height:66px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px;border:1px dashed #b9cdb9;border-radius:12px;background:#f4f8f0}.selection-tray>strong{margin-left:auto;color:#547057;font-size:12px}.empty-selection{font-size:13px;color:#8a9b8b}.selected-chip{border:0;border-radius:20px;background:#dcebdc;color:#254d34;padding:7px 10px;font-weight:700;cursor:pointer}.selected-chip span{margin-left:6px}.attention-strip{margin:22px 0;display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:12px;padding:15px 17px;background:#eef1e3}.attention-strip div{display:flex;flex-direction:column;gap:3px}.attention-strip strong{font-size:13px}.attention-strip span{font-size:11px;color:#6c796c}.attention-strip button{border:1px solid #8baa89;border-radius:7px;background:#fff;color:#31573b;padding:8px 12px;white-space:nowrap;cursor:pointer}.filter-row{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.filter-row button{border:1px solid #d8e2d6;border-radius:20px;background:#fff;padding:7px 15px;color:#647669;cursor:pointer}.filter-row button.active{background:#28533b;border-color:#28533b;color:#fff}.available-words{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.available-words li button{width:100%;min-height:70px;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #e0e7dd;border-radius:10px;background:#fff;padding:10px 12px;cursor:pointer}.available-words li button:hover,.available-words li button.chosen{border-color:#78a17e;background:#f3f8f1}.available-words li button:disabled{opacity:.55;cursor:default}.check-mark{width:24px;height:24px;display:grid;place-items:center;border:1px solid #bdd0bf;border-radius:50%;color:#336b46;flex:none}.word-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.word-copy strong{font-size:15px}.word-copy small{font-size:11px;color:#738075;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.available-words em{font-size:10px;color:#748475;font-style:normal}.pager{display:flex;justify-content:center;align-items:center;gap:15px;margin-top:20px;font-size:12px}.pager button{border:0;background:none;color:#315f40;cursor:pointer}.pager button:disabled{opacity:.4}.generate-panel{padding:30px;position:sticky;top:20px;background:#eaf1e6}.generate-panel h2{font:700 clamp(24px,2.5vw,31px)/1.2 var(--xl-font-display);margin:16px 0 10px}.generate-panel>p{color:#5b705e;line-height:1.7;font-size:13px}.generate-panel label{display:block;font-weight:700;font-size:13px;margin:32px 0 9px}.generate-panel label small{font-weight:400;color:#708373}.generate-panel input,.practice-item input{box-sizing:border-box;width:100%;border:1px solid #b9cdb9;border-radius:9px;background:#fff;padding:12px 13px;font:inherit;outline-color:#497953}.generate-preview{display:flex;justify-content:space-between;margin:24px 0;border-top:1px solid #c9d9c6;padding-top:19px;font-size:13px}.generate-button,.practice-footer button{width:100%;border:0;border-radius:10px;background:#28533b;color:#fff;min-height:48px;font-weight:750;cursor:pointer}.generate-button:disabled,.practice-footer button:disabled{opacity:.55;cursor:default}.generate-panel .generate-note{font-size:11px;text-align:center;margin:12px 0 0}.reader-topline{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;font-size:12px;color:#6d806e}.reader-topline button{border:0;background:none;color:#2e6240;font-weight:700;cursor:pointer}.reader-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.65fr);gap:24px;align-items:start}.reading-paper{padding:clamp(28px,5vw,62px);background:#fffefa}.reading-paper h2{font:700 clamp(29px,3vw,42px)/1.2 var(--xl-font-display);margin:18px 0 30px}.reading-content{white-space:pre-wrap;font:400 clamp(18px,2vw,21px)/1.9 Georgia,serif;color:#2d3930}.target-word{border:0;border-bottom:2px solid #91b391;padding-inline:1px;background:#e9f4e7;color:#214d31;font:inherit;cursor:pointer}.reading-hint{border-top:1px solid #e2e9dd;padding-top:20px;color:#738276;font-size:12px}.word-sidebar{padding:26px;position:sticky;top:20px}.word-sidebar h3{font:700 22px var(--xl-font-display);margin:10px 0 22px}.active-meaning{display:flex;flex-direction:column;gap:8px;border-radius:9px;background:#e9f3e6;padding:16px;color:#31543a}.active-meaning strong{font:700 22px Georgia,serif}.active-meaning span,.sidebar-instruction{font-size:12px;line-height:1.65}.word-sidebar ol{padding:0;margin:20px 0 0;list-style:none}.word-sidebar li{display:flex;gap:15px;padding:10px 0;border-bottom:1px solid #edf0eb}.word-sidebar li span{color:#9aaa9c;font-size:11px}.word-sidebar li strong{font:600 16px Georgia,serif}.practice-panel{margin-top:24px;padding:30px}.practice-list{display:grid;gap:12px}.practice-item{display:grid;grid-template-columns:36px minmax(0,1fr) 170px;gap:15px;align-items:center;padding:14px;background:#f7f9f4;border-radius:10px}.practice-number{font-size:12px;color:#7c9980}.practice-sentence{font:16px/1.5 Georgia,serif}.practice-item small{grid-column:2/-1;color:#3d704b}.practice-footer{display:flex;justify-content:flex-end;align-items:center;gap:20px;margin-top:20px}.practice-footer p{margin:0;color:#315a3c}.practice-footer button{width:auto;padding:0 23px}.history-panel{margin-top:32px;padding:28px}.history-heading h2{margin-bottom:22px}.history-empty{font-size:13px;color:var(--xl-ink-soft)}.history-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.history-list button{display:grid;grid-template-columns:1fr auto;gap:6px;text-align:left;border:1px solid #e0e7dc;border-radius:10px;background:#fff;padding:16px;cursor:pointer}.history-list button:hover{border-color:#88a98a}.history-list span,.history-list small{font-size:11px;color:#78907b}.history-list strong{font:700 18px var(--xl-font-display);grid-column:1}.history-list small{grid-column:1}.history-list i{grid-column:2;grid-row:1/4;align-self:center;color:#477a51;font-style:normal}@media(max-width:860px){.compose-grid,.reader-layout{grid-template-columns:1fr}.generate-panel,.word-sidebar{position:static}.history-list{grid-template-columns:1fr}}@media(max-width:600px){.compose-panel,.generate-panel,.practice-panel,.history-panel{padding:20px}.available-words{grid-template-columns:1fr}.practice-item{grid-template-columns:30px 1fr}.practice-item input{grid-column:2}.practice-item small{grid-column:2}.reader-topline{gap:12px}.practice-footer{display:block}.practice-footer button{margin-top:14px;width:100%}}
</style>
