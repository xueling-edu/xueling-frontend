<template>
  <main class="study-page">
    <div class="study-shell">
      <header class="study-header">
        <PageBreadcrumb :items="[{ label: '首页', to: '/' }, { label: '英语学习', to: '/english' }, { label: '今日学习' }]" />
        <div class="header-actions">
          <button class="settings-link" type="button" @click="router.push('/english/vocab/insights')">学习进度</button>
          <button class="settings-link" type="button" @click="openSettings">设置</button>
        </div>
      </header>

      <section class="intro">
        <div>
          <h1>今日学习</h1>
          <p class="study-subtitle">先回忆，再揭晓答案，按自己的节奏完成计划。</p>
        </div>
        <div class="today-date">{{ dateLabel }}</div>
      </section>

      <section v-if="reviewTransition && (saving || loading)" class="review-transition" role="status" aria-live="polite" aria-atomic="true">
        <div class="transition-art" aria-hidden="true">
          <div class="transition-card transition-card-back"></div>
          <div class="transition-card transition-card-front"><span class="transition-spark">✦</span><strong>{{ reviewTransition.word }}</strong><span class="transition-card-foot">RECALL / {{ reviewTransition.rating }}</span></div>
          <span class="transition-orbit orbit-one"></span><span class="transition-orbit orbit-two"></span>
        </div>
        <span class="transition-eyebrow">今日学习 · 记忆入档</span>
        <h2>{{ reviewTransition.phase === 'saving' ? '正在收好这次回忆' : '已记录，准备下一词' }}</h2>
        <p>{{ reviewTransition.phase === 'saving' ? '你可以稍作停顿，结果确认后就继续。' : '下一张卡片马上就位。' }}</p>
        <div class="transition-trail" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      </section>
      <div v-else-if="loading" class="state-panel" role="status">正在整理今天的单词…</div>
      <section v-else-if="pendingReview" class="state-panel attention-panel" aria-label="待确认的评分" role="alert">
        <h2>{{ saving ? '正在确认评分…' : canRefreshAfterError ? '当前卡片已变化' : '上次评分尚未确认' }}</h2>
        <p>{{ saveError || '正在用原请求确认保存结果，请稍候。' }}</p>
        <div class="complete-actions">
          <button class="primary-button" type="button" :disabled="saving" @click="sendReview(pendingReview)">
            {{ saving ? '正在确认…' : '重试确认本次评分' }}
          </button>
          <button v-if="canRefreshAfterError" class="text-button" type="button" :disabled="saving" @click="refreshAfterConflict">同步最新学习计划</button>
        </div>
      </section>
      <div v-else-if="loadError" class="state-panel" role="alert">
        <h2>{{ followup ? '暂时无法同步巩固任务' : '暂时无法读取学习计划' }}</h2>
        <p>{{ loadError }}</p>
        <button class="primary-button" type="button" @click="loadToday">重新加载</button>
      </div>

      <section v-else-if="currentCard" class="session" aria-label="学习卡片" aria-live="polite">
        <div class="session-meta">
          <span class="pill">{{ currentCard.newCard ? '新词' : '到期复习' }}</span>
          <span v-if="followup" class="session-counts">{{ followup.mode === 'revisit' ? '记忆回声 · 不改变正式评分' : '评分已保存 · 巩固当前词' }}</span>
          <span v-else class="session-counts">今日已完成 {{ today!.todayReviewed }} 次 <i aria-hidden="true">·</i> 待复习 {{ today!.dueCount }} <i aria-hidden="true">·</i> 新词额度 {{ today!.newRemaining }}</span>
        </div>
        <div :key="`${currentCard.wordId}-${currentCard.version}`" class="flashcard" :class="{ revealed: cardRevealed }">
          <div class="card-inner">
            <div class="card-face card-front" :aria-hidden="cardRevealed">
              <div class="face-top"><span>{{ followup?.mode === 'revisit' ? '记忆回声' : '回忆' }}</span><span>01 / 02</span></div>
              <div class="front-focus">
                <h2>{{ currentCard.word }}</h2>
                <span class="front-rule" aria-hidden="true"></span>
                <p>{{ followup?.mode === 'revisit' ? '刚才见过的词，意思还能找回来吗？' : '在心里说出它的中文释义' }}</p>
              </div>
            </div>
            <div v-if="cardRevealed" class="card-face card-back" :aria-hidden="!cardRevealed">
              <div class="face-top"><span>答案</span><span>02 / 02</span></div>
              <div class="back-content">
                <h2>{{ currentCard.word }}</h2>
                <div class="answer-tools">
                  <span v-if="currentCard.phonetic" class="phonetic">/{{ currentCard.phonetic }}/</span>
                  <button class="audio-button" type="button" :aria-label="'播放 ' + currentCard.word + ' 的读音'" @click="playAudio(currentCard.word)">♫ 听发音</button>
                </div>
                <div class="definition-section">
                  <span class="answer-label">{{ followup ? '本轮核心义' : '中文释义' }}</span>
                  <div id="study-definition-list" class="definition-list" :class="{ 'echo-returned': revisitResult === 'revisit_pass' }">
                    <div v-for="(entry, index) in displayedMeaningEntries" :key="index" class="definition-row" :class="{ 'without-pos': !entry.pos }">
                      <span v-if="entry.pos" class="part-of-speech">{{ entry.pos }}</span>
                      <p class="meaning">{{ entry.text }}</p>
                    </div>
                  </div>
                  <button v-if="hasMoreMeaning" class="definition-toggle" type="button" aria-controls="study-definition-list" :aria-expanded="expandedMeaning" @click="expandedMeaning = !expandedMeaning">
                    {{ expandedMeaning ? '收起释义' : '展开完整释义' }} <span aria-hidden="true">{{ expandedMeaning ? '↑' : '↓' }}</span>
                  </button>
                </div>
                <details v-if="followup && currentCard.contextSentence" class="example-disclosure followup-example">
                  <summary>查看例句{{ followup.rating === 3 ? '与译文' : '线索与译文' }}</summary>
                  <div class="example"><p>{{ currentCard.contextSentence }}</p><p v-if="currentCard.contextTranslation">{{ currentCard.contextTranslation }}</p></div>
                </details>
                <details v-else-if="currentCard.example" class="example-disclosure">
                  <summary>查看例句与译文</summary>
                  <div class="example">
                    <p>{{ currentCard.example }}</p>
                    <p v-if="currentCard.exampleTranslation">{{ currentCard.exampleTranslation }}</p>
                  </div>
                </details>
                <div class="answer-footer">
                  <button class="issue-link" type="button" :aria-label="`反馈 ${currentCard.word} 的内容问题`" @click="openIssue">反馈内容问题</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="study-actions">
          <div v-if="followup" class="followup-flow" aria-live="polite">
            <span class="followup-label">{{ followup.mode === 'revisit' ? '隔开后的再次回忆' : followup.rating === 1 ? '重建词义连接' : followup.rating === 2 ? '找到绊脚点' : '轻量语境确认' }}</span>
            <template v-if="followup.mode === 'revisit'">
              <template v-if="followup.step === 'recall'">
                <p>先独立想出中文核心义，再揭晓核对。</p>
                <div class="followup-actions"><button class="primary-button" type="button" @click="setFollowupStep('checked')">揭晓并核对</button><button class="text-button" type="button" :disabled="actionSaving" @click="recordRevisit('skipped')">跳过回声</button></div>
              </template>
              <template v-else-if="!revisitResult">
                <p>和核心义核对：刚才是否独立想对？</p>
                <div class="followup-actions"><button class="primary-button" type="button" :disabled="actionSaving" @click="recordRevisit('revisit_pass')">想对了</button><button class="text-button" type="button" :disabled="actionSaving" @click="recordRevisit('revisit_fail')">还没想起</button></div>
              </template>
              <template v-else><p>{{ revisitResult === 'revisit_pass' ? '这次找回来了。' : revisitResult === 'revisit_fail' ? '再看一眼核心义，之后按正式复习计划回来。' : '已跳过本轮回声。' }}</p><button class="primary-button" type="button" @click="finishFollowup">继续学习</button></template>
            </template>
            <template v-else-if="followup.rating === 2 && followup.step === 'study'">
              <p>刚才困难在哪里？也可以直接看核心义继续。</p>
              <div class="followup-actions"><button class="text-button" type="button" @click="chooseDiagnosis('meaning_slow')">意思想得慢</button><button class="text-button" type="button" @click="chooseDiagnosis('context_unsure')">在句子里不确定</button><button class="primary-button" type="button" :disabled="actionSaving" @click="finishTeaching('done')">继续</button></div>
            </template>
            <template v-else>
              <p v-if="followup.rating === 1">先把英文和上面的核心义连起来{{ currentCard.contextSentence ? '，需要时展开例句找线索' : '' }}。稍后会再回忆一次。</p>
              <p v-else-if="followup.rating === 2">{{ followup.diagnosis === 'context_unsure' && currentCard.contextSentence ? '先看英文例句，再展开译文核对当前词义。' : '再看清这个核心义，下次回忆时先从英文找回它。' }}</p>
              <p v-else>首次遇到但已认识；{{ currentCard.contextSentence ? '可先看英文例句，再展开译文核对。' : '已记录首次回忆。' }}</p>
              <div v-if="showContextQuestion" class="context-question">
                <p>{{ currentCard.contextQuestion }}</p>
                <div class="followup-actions"><button class="text-button" type="button" :disabled="!!contextResult" @click="selectContext('A')">A. {{ currentCard.optionA }}</button><button class="text-button" type="button" :disabled="!!contextResult" @click="selectContext('B')">B. {{ currentCard.optionB }}</button></div>
                <p v-if="contextResult" role="status">{{ contextResult === 'context_pass' ? '在这句话里，你找对了。' : `这句话里是“${currentCard.coreMeaning || meaningEntries[0]?.text}”。` }} {{ currentCard.clueExplanation }}</p>
              </div>
              <button class="primary-button" type="button" :disabled="actionSaving" @click="finishTeaching(contextResult || followup.diagnosis || 'done')">{{ actionSaving ? '正在记录…' : '继续学习' }}</button>
            </template>
            <p v-if="actionError" class="save-error" role="alert">{{ actionError }}</p>
          </div>
          <button v-else-if="!revealed" class="reveal-button" type="button" @click="reveal">已回忆，查看答案 <span aria-hidden="true">↗</span></button>
          <template v-else>
            <p class="rate-prompt">{{ saving ? '正在保存本次评分…' : '揭晓前，你回忆得怎么样？' }}</p>
            <div class="rating-grid">
              <button v-for="option in ratingOptions" :key="option.value" type="button" :disabled="saving"
                :class="['rating-button', option.className]" @click="rate(option.value)">
                <kbd>{{ option.value }}</kbd><strong>{{ option.value === 1 && currentCard.newCard ? '不会' : option.label }}</strong><span>{{ option.hint }}</span>
              </button>
            </div>
            <p class="rating-note">按揭晓前的回忆评分 · 键盘 1–4</p>
          </template>
          <p v-if="!followup && !revealed && currentCard.newCard" class="shortcut-note">新词可以直接揭晓。</p>
        </div>
      </section>

      <section v-else-if="planState === 'none'" class="state-panel setup-panel">
        <div class="complete-mark">＋</div>
        <h2>先选一本词书</h2>
        <p>将词书加入学习计划后，这里才会出现今天要学的单词。</p>
        <div class="complete-actions">
          <button class="primary-button" type="button" @click="router.push('/english/vocab')">选择词书</button>
          <button class="text-button" type="button" @click="router.push('/english/articles')">先浏览英语文章</button>
        </div>
      </section>

      <section v-else class="state-panel complete-panel" :class="{ 'is-checked-in': today?.checkedIn, 'has-next-review': !!nextReviewDisplay }">
        <div class="completion-heading">
          <div class="complete-mark" aria-hidden="true">{{ today?.checkedIn ? '✦' : '↗' }}</div>
          <div class="completion-copy">
            <span class="completion-eyebrow">{{ today?.checkedIn ? '今日目标达成 · 已打卡' : today?.todayReviewed ? '今日学习 · 暂歇' : '今日学习 · 等待开始' }}</span>
            <h2>{{ today?.checkedIn ? '今天的学习已完成' : today?.todayReviewed ? '当前没有可学卡片' : '今天还没有可学单词' }}</h2>
            <p v-if="today?.checkedIn" class="check-in-note">已自动打卡，成长日历已点亮。</p>
            <p v-else-if="today?.todayReviewed">今天已完成 {{ today.todayReviewed }} 次正式回忆，新的卡片会按计划出现。</p>
            <p v-else>看看词书计划，或等下一张卡片到期。</p>
          </div>
        </div>
        <div v-if="pendingEchoCount" class="echo-reminder">
          <span class="echo-reminder-symbol" aria-hidden="true">✧</span>
          <p><strong>{{ pendingEchoCount }} 个记忆回声待回访</strong><span>隔开其他词后再回忆；本轮没有更多词时，按下一次到期时间回来。</span></p>
        </div>
        <div v-if="nextReviewDisplay" class="next-review">
          <span class="next-review-icon" aria-hidden="true">↻</span>
          <div>
            <span class="next-review-label">下一次复习</span>
            <p>{{ nextReviewDisplay.relative }}</p>
            <small>{{ nextReviewDisplay.absolute }}</small>
          </div>
        </div>
        <p v-else-if="planState === 'unknown' && !today?.todayReviewed" class="completion-hint">尚未找到可学的单词，请检查词书计划或稍后重试。</p>
        <p v-else-if="today?.newRemaining && today.newRemaining > 0" class="completion-hint">当前启用的词书没有更多未学单词。</p>
        <div class="complete-actions">
          <button v-if="today?.checkedIn" class="primary-button" type="button" @click="router.push('/english/vocab/insights#growth-calendar')">查看成长日历 <span aria-hidden="true">↗</span></button>
          <button v-else-if="today?.todayReviewed" class="primary-button" type="button" @click="router.push('/english/vocab/insights')">查看学习进度 <span aria-hidden="true">↗</span></button>
          <button v-else class="primary-button" type="button" @click="router.push('/english/vocab')">管理词书 <span aria-hidden="true">↗</span></button>
          <button class="text-button" type="button" @click="loadToday">检查新任务</button>
          <button v-if="today?.todayReviewed" class="text-button" type="button" @click="router.push('/english/vocab')">管理词书</button>
        </div>
        <div v-if="today?.todayReviewed" class="completion-stats" aria-label="今日学习概览">
          <div><strong>{{ today.todayReviewed }}<small>次</small></strong><span>今日正式回忆</span></div>
          <div><strong>{{ followupSummary.passed }}<small>个</small></strong><span>本轮回访想起</span></div>
          <div><strong>{{ followupSummary.failed + followupSummary.skipped + pendingEchoCount }}<small>个</small></strong><span>仍需巩固</span></div>
        </div>
      </section>
    </div>

    <WordIssueDialog v-if="issueTarget" :target="issueTarget" @close="issueTarget = null" />
    <el-dialog v-model="settingsOpen" title="学习设置" width="min(92vw, 440px)">
      <el-form v-if="settingsDraft" label-position="top">
        <el-form-item label="每天最多学习新词">
          <el-input-number v-model="settingsDraft.dailyNewLimit" :min="0" :max="100" />
          <p class="setting-help">到期复习优先；积压较多时会暂缓新词。</p>
        </el-form-item>
        <el-form-item label="目标记忆率">
          <el-slider v-model="retentionPercent" :min="80" :max="97" :step="1" show-input />
          <p class="setting-help">目标越高，通常需要复习得越频繁。建议先使用默认值。</p>
        </el-form-item>
        <el-form-item label="时区">
          <el-input v-model="settingsDraft.timeZone" placeholder="Asia/Shanghai" />
          <button class="zone-action" type="button" @click="settingsDraft.timeZone = deviceTimeZone">使用设备时区（{{ deviceTimeZone }}）</button>
          <p class="setting-help">用于划分每天的学习记录；修改后，过去的打卡日期不会重算。</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsOpen = false">取消</el-button>
        <el-button type="primary" :loading="savingSettings" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStudyFollowups, getStudyFollowupSummary, recordStudyAction, getStudySettings, getTodayStudy, getWordBooks, submitStudyReview, updateStudySettings } from '@/features/vocab/api'
import type { StudyFollowup, StudyQueueCard, StudySettings, SubmitStudyReview, TodayStudy } from '@/features/vocab/types'
import { clearPendingReview, persistPendingReview, restorePendingReview } from '@/features/vocab/pendingReview'
import { clearFollowup, persistFollowup, restoreFollowup } from '@/features/vocab/followupStudy'
import type { FollowupStudy } from '@/features/vocab/followupStudy'
import { createReviewRequestId } from '@/features/vocab/requestId'
import { useUserStore } from '@/stores/user'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'
import WordIssueDialog from '@/features/feedback/WordIssueDialog.vue'
import type { CorrectionTarget } from '@/features/feedback/WordIssueDialog.vue'
import { cancelEnglishWord, preloadEnglishWord, speakEnglishWord } from '@/utils/wordSpeech'

const router = useRouter()
const userStore = useUserStore()
const today = ref<TodayStudy | null>(null)
const planState = ref<'unknown' | 'none' | 'ready'>('unknown')
const loading = ref(true)
const loadError = ref('')
const revealed = ref(false)
const expandedMeaning = ref(false)
const saving = ref(false)
const reviewTransition = ref<{ word: string; rating: number; phase: 'saving' | 'next' } | null>(null)
const saveError = ref('')
const canRefreshAfterError = ref(false)
const pendingReview = ref<SubmitStudyReview | null>(null)
const followup = ref<FollowupStudy | null>(null)
const serverFollowups = ref<StudyFollowup[]>([])
const followupSummary = ref({ passed: 0, failed: 0, skipped: 0 })
const revisitResult = ref<'revisit_pass' | 'revisit_fail' | 'skipped' | null>(null)
const contextResult = ref<'context_pass' | 'context_fail' | null>(null)
const actionSaving = ref(false)
const actionError = ref('')
const shownAt = ref(Date.now())
const settingsOpen = ref(false)
const issueTarget = ref<CorrectionTarget | null>(null)
const savingSettings = ref(false)
const settingsDraft = ref<StudySettings | null>(null)
const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
const timeZone = ref(deviceTimeZone)
const currentTime = ref(Date.now())
let timeRefresh: ReturnType<typeof setInterval> | undefined
const retentionPercent = computed({
  get: () => Math.round((settingsDraft.value?.desiredRetention ?? 0.9) * 100),
  set: value => { if (settingsDraft.value) settingsDraft.value.desiredRetention = value / 100 }
})
const currentCard = computed<StudyQueueCard | null>(() => followup.value?.card ?? today.value?.cards[0] ?? null)
// The API returns an ordered queue. A follow-up can temporarily replace its first card.
const nextCardWord = computed(() => currentCard.value
  ? today.value?.cards.find(card => card.wordId !== currentCard.value?.wordId)?.word
  : undefined)
watch([() => currentCard.value?.word, nextCardWord], ([word, nextWord]) => {
  if (word) preloadEnglishWord(word)
  if (nextWord) preloadEnglishWord(nextWord)
}, { immediate: true })
function openIssue() {
  if (!currentCard.value) return
  issueTarget.value = {
    wordId: currentCard.value.wordId, word: currentCard.value.word,
    meaning: currentCard.value.meaning, phonetic: currentCard.value.phonetic,
    example: currentCard.value.example, exampleTranslation: currentCard.value.exampleTranslation,
  }
}
const cardRevealed = computed(() => followup.value
  ? followup.value.mode === 'revisit' ? followup.value.step !== 'recall'
    : !(followup.value.rating === 2 && followup.value.diagnosis === 'context_unsure'
      && showContextQuestion.value && !contextResult.value)
  : revealed.value)
const showContextQuestion = computed(() => !!followup.value && followup.value.mode !== 'revisit'
  && (followup.value.rating === 1 || followup.value.diagnosis === 'context_unsure')
  && !!currentCard.value?.contextSentence && !!currentCard.value.contextQuestion
  && !!currentCard.value.optionA && !!currentCard.value.optionB
  && (currentCard.value.correctOption === 'A' || currentCard.value.correctOption === 'B')
  && !!currentCard.value.clueExplanation)
const pendingEchoCount = computed(() => serverFollowups.value.filter(item => item.rating <= 2 && item.teachingResult && new Date(item.dueAt).getTime() > Date.now()).length)
const meaningEntries = computed(() => {
  const entries: { pos: string; text: string }[] = []
  const lines = (currentCard.value?.meaning ?? '').replace(/\\n/g, '\n').split(/\r?\n/)
  const clean = (text: string) => text.trim().replace(/^[；;,\s]+|[；;,\s]+$/g, '').replace(/,\s*(?=[\u3400-\u9fff])/g, '，')

  for (const line of lines) {
    const markers = [...line.matchAll(/\b(n|v|vt|vi|adj|adv|prep|conj|pron|int|interj|num|art|aux|pl|abbr|a|ad)\.\s*/gi)]
    if (!markers.length) {
      const text = clean(line)
      if (text) entries.push({ pos: '', text })
      continue
    }
    const prefix = clean(line.slice(0, markers[0]!.index ?? 0))
    if (prefix) entries.push({ pos: '', text: prefix })
    markers.forEach((marker, index) => {
      const text = clean(line.slice((marker.index ?? 0) + marker[0].length, markers[index + 1]?.index ?? line.length))
      if (text) entries.push({ pos: `${marker[1]!.toLowerCase()}.`, text })
    })
  }
  return entries
})
const MAX_PREVIEW_ROWS = 2
const MAX_PREVIEW_CHARACTERS = 46
const hasMoreMeaning = computed(() => meaningEntries.value.length > MAX_PREVIEW_ROWS
  || meaningEntries.value.some(entry => entry.text.length > MAX_PREVIEW_CHARACTERS))
const displayedMeaningEntries = computed(() => {
  if (followup.value && !expandedMeaning.value) return [{ pos: '', text: currentCard.value?.coreMeaning || meaningEntries.value[0]?.text || '' }]
  if (!hasMoreMeaning.value || expandedMeaning.value) return meaningEntries.value
  return meaningEntries.value.slice(0, MAX_PREVIEW_ROWS).map(entry => ({
    ...entry,
    text: entry.text.length > MAX_PREVIEW_CHARACTERS
      ? `${entry.text.slice(0, MAX_PREVIEW_CHARACTERS).trimEnd()}…`
      : entry.text
  }))
})
const dateLabel = computed(() => {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timeZone.value, month: 'numeric', day: 'numeric', weekday: 'long'
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('month')}月${part('day')}日 · ${part('weekday').replace('星期', '周')}`
})
const nextReviewDisplay = computed(() => {
  if (!today.value?.nextDueAt) return null
  const due = new Date(today.value.nextDueAt)
  if (Number.isNaN(due.getTime())) return null
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timeZone.value, month: 'numeric', day: 'numeric', weekday: 'long',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(due)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  const absolute = `${part('month')}月${part('day')}日 · ${part('weekday').replace('星期', '周')} ${part('hour')}:${part('minute')}`
  const minutes = Math.ceil((due.getTime() - currentTime.value) / 60_000)
  const relative = minutes <= 0 ? '已到复习时间' : minutes < 60 ? `约 ${minutes} 分钟后` : minutes < 2_880
    ? `约 ${Math.ceil(minutes / 60)} 小时后` : `约 ${Math.round(minutes / 1_440)} 天后`
  return { absolute, relative }
})
const ratingOptions = [
  { value: 1, label: '忘记了', hint: '没想起或答错', className: 'again' },
  { value: 2, label: '很困难', hint: '费力但想对', className: 'hard' },
  { value: 3, label: '记得', hint: '独立想起释义', className: 'good' },
  { value: 4, label: '很容易', hint: '立刻准确想起', className: 'easy' }
] as const

async function loadToday() {
  loading.value = true
  loadError.value = ''
  planState.value = 'unknown'
  try {
    const [todayResult, followupsResult, summaryResult] = await Promise.allSettled([
      getTodayStudy(), getStudyFollowups(), getStudyFollowupSummary()
    ])
    if (todayResult.status === 'rejected') throw todayResult.reason
    const response = todayResult.value
    today.value = response.data
    try {
      if (followupsResult.status === 'rejected') throw followupsResult.reason
      if (summaryResult.status === 'rejected') throw summaryResult.reason
      serverFollowups.value = followupsResult.value.data
      followupSummary.value = summaryResult.value.data
      if (followup.value?.confirmed) {
        const matching = serverFollowups.value.find(item => item.requestId === followup.value?.requestId)
        if (!matching || (followup.value.mode !== 'revisit' && matching.teachingResult)) {
          clearFollowup(userStore.userInfo?.id)
          followup.value = null
        } else if (followup.value.mode === 'revisit' && new Date(matching.dueAt).getTime() <= Date.now()) {
          clearFollowup(userStore.userInfo?.id)
          followup.value = null
        }
      }
      if (!followup.value) {
        const dueIds = new Set(response.data.cards.filter(card => !card.newCard).map(card => card.wordId))
        const pending = serverFollowups.value.find(item => !item.teachingResult)
          ?? serverFollowups.value.find(item => item.rating <= 2 && item.teachingResult
            && item.laterCards >= 2 && new Date(item.dueAt).getTime() > Date.now() && !dueIds.has(item.wordId))
        if (pending) {
          const mode = pending.teachingResult ? 'revisit' : 'teaching'
          followup.value = { requestId: pending.requestId, rating: pending.rating as 1 | 2 | 3,
            card: { wordId: pending.wordId, word: pending.word, meaning: pending.meaning,
              phonetic: pending.phonetic, example: pending.example, exampleTranslation: pending.exampleTranslation,
              coreMeaning: pending.coreMeaning, contextSentence: pending.contextSentence,
              contextTranslation: pending.contextTranslation, contextQuestion: pending.contextQuestion,
              optionA: pending.optionA, optionB: pending.optionB, correctOption: pending.correctOption,
              clueExplanation: pending.clueExplanation, contentVersion: pending.contentVersion,
              state: 'REVIEW', version: 0, newCard: pending.newCard, dueAt: pending.dueAt },
            step: mode === 'revisit' ? 'recall' : 'study', mode, confirmed: true }
          persistFollowup(userStore.userInfo?.id, followup.value)
        }
      }
    } catch (error) { console.error('读取巩固任务失败', error); loadError.value = '无法确认未完成的巩固任务，请重新加载。' }
    if (response.data.cards.length === 0) {
      try {
        const books = (await getWordBooks()).data
        planState.value = books.some(book => book.studyEnabled) ? 'ready' : 'none'
      } catch (error) {
        console.error('读取词书计划失败', error)
      }
    } else {
      planState.value = 'ready'
    }
    revealed.value = false
    expandedMeaning.value = false
    shownAt.value = Date.now()
  } catch (error: any) {
    loadError.value = error?.msg || '请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

function reveal() { revealed.value = true }

function handleKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || settingsOpen.value || issueTarget.value || loading.value || pendingReview.value) return
  const target = event.target
  if (target instanceof HTMLElement && (target.closest('button, input, textarea, select, [contenteditable="true"]'))) return
  if (!currentCard.value) return
  if (followup.value) {
    if (followup.value.mode === 'revisit' && event.code === 'Space' && followup.value.step === 'recall') {
      event.preventDefault(); setFollowupStep('checked')
    }
    return
  }
  if (!revealed.value && event.code === 'Space') {
    event.preventDefault()
    reveal()
  } else if (revealed.value && !saving.value && /^[1-4]$/.test(event.key)) {
    event.preventDefault()
    rate(Number(event.key) as 1 | 2 | 3 | 4)
  }
}

function playAudio(word: string) {
  if (!speakEnglishWord(word, message => ElMessage.warning(message))) {
    ElMessage.warning('当前浏览器不支持网页语音，请尝试系统浏览器')
  }
}

function rate(rating: 1 | 2 | 3 | 4) {
  if (!revealed.value || !currentCard.value || saving.value) return
  reviewTransition.value = { word: currentCard.value.word, rating, phase: 'saving' }
  const review: SubmitStudyReview = {
    wordId: currentCard.value.wordId,
    rating,
    expectedVersion: currentCard.value.version,
    requestId: createReviewRequestId(),
    elapsedMs: Math.min(600_000, Date.now() - shownAt.value)
  }
  if (rating <= 2 || (rating === 3 && currentCard.value.newCard && !!currentCard.value.contextSentence)) {
    const nextFollowup: FollowupStudy = { requestId: review.requestId, rating: rating as 1 | 2 | 3, card: { ...currentCard.value }, step: 'study', mode: 'teaching', confirmed: false }
    followup.value = nextFollowup
    persistFollowup(userStore.userInfo?.id, nextFollowup)
  }
  pendingReview.value = review
  persistPendingReview(userStore.userInfo?.id, review)
  void sendReview(review)
}

async function sendReview(review: SubmitStudyReview) {
  if (saving.value) return
  if (!reviewTransition.value) reviewTransition.value = { word: currentCard.value?.word ?? '这张卡片', rating: review.rating, phase: 'saving' }
  saving.value = true
  saveError.value = ''
  canRefreshAfterError.value = false
  try {
    await submitStudyReview(review)
    if (followup.value?.requestId === review.requestId) {
      followup.value = { ...followup.value, confirmed: true }
      persistFollowup(userStore.userInfo?.id, followup.value)
    }
    clearPendingReview(userStore.userInfo?.id)
    pendingReview.value = null
    saveError.value = ''
    canRefreshAfterError.value = false
    if (review.rating === 4 || followup.value?.requestId !== review.requestId) {
      clearFollowup(userStore.userInfo?.id)
      followup.value = null
      reviewTransition.value.phase = 'next'
      await loadToday()
    }
  } catch (error: any) {
    saveError.value = error?.msg || '评分未确认保存，请使用同一个请求重试。'
    canRefreshAfterError.value = error?.code === 500 || error?.code === 501
  } finally {
    saving.value = false
    reviewTransition.value = null
  }
}

function refreshAfterConflict() {
  clearPendingReview(userStore.userInfo?.id)
  clearFollowup(userStore.userInfo?.id)
  pendingReview.value = null
  followup.value = null
  saveError.value = ''
  canRefreshAfterError.value = false
  void loadToday()
}

function setFollowupStep(step: FollowupStudy['step']) {
  if (!followup.value) return
  followup.value = { ...followup.value, step }
  persistFollowup(userStore.userInfo?.id, followup.value)
}

function chooseDiagnosis(diagnosis: 'meaning_slow' | 'context_unsure') {
  if (!followup.value) return
  followup.value = { ...followup.value, diagnosis, step: 'context' }
  persistFollowup(userStore.userInfo?.id, followup.value)
}

function selectContext(option: 'A' | 'B') {
  if (!showContextQuestion.value || contextResult.value) return
  contextResult.value = option === currentCard.value?.correctOption ? 'context_pass' : 'context_fail'
}

async function finishTeaching(result: string) {
  if (!followup.value || actionSaving.value) return
  actionSaving.value = true
  actionError.value = ''
  try {
    await recordStudyAction(followup.value.requestId, 'teaching', result)
    finishFollowup()
  } catch (error: any) { actionError.value = error?.msg || '巩固结果未保存，请重试。' }
  finally { actionSaving.value = false }
}

async function recordRevisit(result: 'revisit_pass' | 'revisit_fail' | 'skipped') {
  if (!followup.value || actionSaving.value) return
  actionSaving.value = true
  actionError.value = ''
  try {
    await recordStudyAction(followup.value.requestId, 'revisit', result)
    revisitResult.value = result
    if (result === 'skipped') setFollowupStep('checked')
  } catch (error: any) { actionError.value = error?.msg || '回访结果未保存，请重试。' }
  finally { actionSaving.value = false }
}

function finishFollowup() {
  clearFollowup(userStore.userInfo?.id)
  followup.value = null
  revisitResult.value = null
  contextResult.value = null
  void loadToday()
}

async function openSettings() {
  try {
    const response = await getStudySettings()
    settingsDraft.value = { ...response.data }
    timeZone.value = response.data.timeZone
    settingsOpen.value = true
  } catch (error: any) {
    ElMessage.error(error?.msg || '无法读取学习设置')
  }
}

async function saveSettings() {
  if (!settingsDraft.value) return
  savingSettings.value = true
  try {
    await updateStudySettings(settingsDraft.value)
    timeZone.value = settingsDraft.value.timeZone
    settingsOpen.value = false
    await loadToday()
    ElMessage.success('学习设置已保存')
  } catch (error: any) {
    ElMessage.error(error?.msg || '保存失败')
  } finally {
    savingSettings.value = false
  }
}

onMounted(async () => {
  timeRefresh = setInterval(() => { currentTime.value = Date.now() }, 60_000)
  window.addEventListener('keydown', handleKeydown)
  followup.value = restoreFollowup(userStore.userInfo?.id)
  pendingReview.value = restorePendingReview(userStore.userInfo?.id)
  if (followup.value && !followup.value.confirmed && !pendingReview.value) {
    clearFollowup(userStore.userInfo?.id)
    followup.value = null
  }
  await loadToday()
  if (pendingReview.value) void sendReview(pendingReview.value)
  void getStudySettings().then(response => { timeZone.value = response.data.timeZone }).catch(() => {})
})
onUnmounted(() => {
  if (timeRefresh) clearInterval(timeRefresh)
  window.removeEventListener('keydown', handleKeydown)
  cancelEnglishWord()
})
</script>

<style scoped>
.study-page { min-height: 100vh; color: #20372b; background: #f4f3ea; font-family: 'Noto Sans SC', 'Microsoft YaHei', sans-serif; padding: 30px 24px 80px; }
.study-shell { max-width: 1020px; margin: auto; }
.study-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid #d9dfd5; padding-bottom: 18px; }
.header-actions { display: flex; align-items: center; gap: 18px; }
button { cursor: pointer; font: inherit; }
.settings-link, .text-button { border: 0; background: transparent; color: #315c49; font-weight: 700; }
.settings-link:hover, .text-button:hover { text-decoration: underline; }
.intro { display: flex; justify-content: space-between; align-items: end; padding: 28px 0 24px; }
.intro h1 { font-family: Georgia, 'Songti SC', serif; font-size: clamp(40px, 6vw, 60px); line-height: 1.05; margin: 8px 0 12px; font-weight: 700; }
.study-subtitle { color: var(--xl-ink-soft); font-size: 14px; line-height: 1.5; }
.today-date { color: #7b8b7e; font-size: 14px; white-space: nowrap; }
.session { max-width: 800px; margin: 0 auto; }.session-meta { display: flex; justify-content: space-between; align-items: center; color: #7c8d7f; font-size: 13px; margin-bottom: 13px; }
.session-counts { text-align:right; font-variant-numeric:tabular-nums; }.session-counts i { margin:0 6px; font-style:normal; color:#b3c1b1; }
.setting-help { width:100%; margin:7px 0 0; color:var(--xl-ink-soft); font-size:12px; line-height:1.5; }
.zone-action { display:block; width:100%; margin-top:6px; padding:2px 0; border:0; background:transparent; color:var(--xl-brand); font-size:12px; font-weight:700; text-align:left; }
.zone-action:hover { text-decoration:underline; }.zone-action:focus-visible { outline:2px solid var(--xl-accent); outline-offset:2px; }
.pill { background: #dbe7da; color: #326348; border-radius: 99px; padding: 6px 12px; font-weight: 800; }
.flashcard { background: #fffef9; min-height: 330px; border-radius: 24px; border: 1px solid #d5e1d1; box-shadow: 0 16px 36px rgba(50, 74, 47, .08); padding: 28px 34px; display: flex; flex-direction: column; transition: border-color .25s, transform .25s; }
.flashcard.revealed { border-color: #a6c0a7; }.card-topline { display: flex; justify-content: space-between; color: #9aab97; letter-spacing: .14em; font-size: 11px; font-weight: 800; }
.word-content { text-align: center; margin: auto 0 20px; }.word-content h2 { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(48px, 9vw, 84px); font-weight: 500; letter-spacing: -.035em; margin: 18px 0 3px; color: #1d3e2e; overflow-wrap: anywhere; }.phonetic { color: #829486; margin: 0 0 16px; }
.audio-button { border: 1px solid #d9e3d8; background: #f1f6ef; color: #3f6a4f; border-radius: 99px; padding: 8px 14px; font-size: 13px; }
.recall-hint { text-align: center; color: #a2afa1; border-top: 1px solid #e8eee5; padding-top: 20px; }
.answer { border-top: 1px solid #e5ebe1; padding-top: 20px; animation: reveal-in .25s ease both; }.answer-label { color: #759477; font-size: 12px; font-weight: 800; letter-spacing: .14em; }.meaning { font-size: 22px; line-height: 1.6; margin: 8px 0; white-space: pre-line; }.example { color: #6c7b70; border-left: 3px solid #d5e5d2; padding-left: 14px; line-height: 1.5; }.example p { margin: 5px 0; }
.study-actions { text-align: center; padding: 24px 0; }.reveal-button, .primary-button { border: 0; color: #fff; background: #285a3e; border-radius: 14px; padding: 14px 27px; font-weight: 800; transition: transform .15s, background .15s; }.reveal-button { min-width: 235px; display: inline-flex; justify-content: space-between; }.reveal-button:hover, .primary-button:hover { transform: translateY(-2px); background: #1d492f; }.primary-button:disabled { opacity: .6; cursor: wait; }.rate-prompt { margin: 0 0 13px; font-weight: 700; }.rating-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }.rating-button { display: flex; flex-direction: column; gap: 4px; border: 1px solid #dce3d6; background: #fffef9; border-radius: 14px; padding: 14px 6px; color: #244330; transition: transform .15s, box-shadow .15s; }.rating-button:hover { transform: translateY(-3px); box-shadow: 0 10px 20px #37543d20; }.rating-button span { font-size: 12px; color: #869488; }.rating-button.again { border-color: #e8c7b9; background: #fff6f1; }.rating-button.easy { border-color: #bddbc7; background: #f3faf3; }.rating-note { font-size: 12px; color: #91a092; margin-top: 15px; }.save-error { color: #b34f36; }.state-panel { max-width: 800px; margin: 0 auto; text-align: center; background: #fffef9; border-radius: 26px; padding: 70px 25px; border: 1px solid #e2e5d9; }.state-panel h2 { font-family: Georgia, 'Songti SC', serif; font-size: 32px; margin: 10px 0; }.state-panel p { color: #738477; }.complete-mark { width: 64px; height: 64px; border-radius: 50%; background: #dbead9; color: #336c43; display: grid; place-items: center; font-size: 32px; margin: auto; }.complete-actions { display: flex; flex-wrap:wrap; justify-content: center; align-items: center; gap: 12px; margin-top: 26px; }
.shortcut-note { color: #7d8e7d; font-size: 12px; margin-top: 12px; }
.check-in-note { color: #3e744b !important; font-weight: 700; }
.rating-button kbd { align-self: center; font: 700 11px Georgia, serif; color: #667e68; border: 1px solid #d2ddcf; border-radius: 4px; padding: 2px 6px; margin-top: 4px; }
.rating-button strong { font-size: 16px; }
.rating-button.hard { border-color: #dfca9d; background: #fffaf0; }
.rating-button.good { border-color: #abc6ad; background: #f2f8f1; }
.rating-button:focus-visible { outline: 3px solid #d6a24d; outline-offset: 2px; }
.attention-panel { border-color: #d8a67e; background: #fffaf3; }
.review-transition { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 760px; min-height: 390px; margin: 0 auto; overflow: hidden; border: 1px solid #d8e3d5; border-radius: 22px; background: radial-gradient(circle at 50% 30%, #f7faf2 0, #fffef9 62%); box-shadow: 0 16px 38px #2946310d; text-align: center; }
.transition-art { position: relative; width: 168px; height: 148px; margin: 0 0 6px; }
.transition-card { position: absolute; top: 18px; left: 25px; width: 118px; height: 112px; border-radius: 13px; }
.transition-card-back { border: 1px solid #c9dac8; background: #e9f1e6; transform: rotate(8deg) translate(8px, -3px); animation: transition-back 1.8s ease-in-out infinite; }
.transition-card-front { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid #9fbca4; background: #fffefa; box-shadow: 0 10px 20px #315c4921; transform: rotate(-6deg); animation: transition-front 1.8s ease-in-out infinite; }
.transition-card-front strong { max-width: 105px; overflow: hidden; color: #254d37; font: 600 19px/1.2 Georgia, 'Songti SC', serif; text-overflow: ellipsis; white-space: nowrap; }
.transition-spark { color: #b58b3f; font-size: 20px; line-height: 1; }
.transition-card-foot { color: #8a9d89; font: 700 9px/1 Georgia, serif; letter-spacing: .1em; }
.transition-orbit { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #b5cbb0; animation: orbit-pulse 1.8s ease-in-out infinite; }
.orbit-one { top: 11px; left: 11px; }.orbit-two { right: 6px; bottom: 19px; animation-delay: .5s; background: #d5b777; }
.transition-eyebrow { color: #6e8c72; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
.review-transition h2 { margin: 10px 0 5px; color: #244a32; font: 650 clamp(23px, 4vw, 29px)/1.35 Georgia, 'Songti SC', serif; }
.review-transition p { margin: 0; padding: 0 20px; color: #738677; font-size: 13px; line-height: 1.6; }
.transition-trail { display: flex; gap: 7px; margin-top: 22px; }
.transition-trail span { width: 17px; height: 3px; border-radius: 9px; background: #d9e5d4; animation: trail-glow 1.4s ease-in-out infinite; }
.transition-trail span:nth-child(2) { animation-delay: .18s; }.transition-trail span:nth-child(3) { animation-delay: .36s; }.transition-trail span:nth-child(4) { animation-delay: .54s; }
@keyframes transition-front { 50% { transform: rotate(0) translateY(-5px); } }
@keyframes transition-back { 50% { transform: rotate(11deg) translate(11px, -7px); } }
@keyframes orbit-pulse { 50% { opacity: .35; transform: scale(.65); } }
@keyframes trail-glow { 50% { background: #5c9267; transform: scaleX(1.2); } }
.reveal-button, .primary-button, .text-button, .audio-button, .rating-button { transition: transform .18s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease; }
.reveal-button, .primary-button { min-height: 50px; border: 1px solid #254c35; border-radius: var(--xl-button-radius); background: var(--xl-brand); box-shadow: var(--xl-button-shadow); font-size: 14px; letter-spacing: .01em; }
.reveal-button:hover:not(:disabled), .primary-button:hover:not(:disabled) { background: var(--xl-brand-hover); transform: translateY(-2px); box-shadow: var(--xl-button-shadow-hover); }
.reveal-button:active:not(:disabled), .primary-button:active:not(:disabled) { transform: translateY(1px); box-shadow: var(--xl-button-shadow-pressed); }
.text-button { min-height: 44px; padding: 0 16px; border: 1px solid #b8cbb9; border-radius: var(--xl-button-radius); background: #fffefa; box-shadow: var(--xl-outline-shadow); }
.text-button:hover:not(:disabled) { background: #edf3e9; border-color: #8eae93; text-decoration: none; transform: translateY(-2px); box-shadow: 0 4px 0 #d7e2d5; }
.text-button:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
.audio-button { min-height: 40px; border-color: #b8cbb9; border-radius: var(--xl-button-radius); background: #f7faf4; font-weight: 750; }
.audio-button:hover { background: #e8f1e7; border-color: #8eae93; }
.rating-button { min-height: 98px; padding: 14px 10px; border-width: 1px; border-bottom-width: 3px; border-radius: var(--xl-button-radius); box-shadow: 0 4px 12px #2946310d; }
.rating-button.again { border-bottom-color: #b66b50; }
.rating-button.hard { border-bottom-color: #b58b3f; }
.rating-button.good { border-bottom-color: #5d8b64; }
.rating-button.easy { border-bottom-color: #397955; }
.rating-button:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 9px 18px #2946311f; }
.rating-button:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
.rating-button:disabled, .text-button:disabled { opacity: .58; cursor: wait; box-shadow: none; transform: none; }
/* 回忆阶段只保留目标词；核对阶段再呈现辅助信息。 */
.study-page { padding-top: 20px; }
.study-shell { max-width: 920px; }
.study-header { padding-bottom: 12px; }
.intro { padding: 20px 0 22px; }
.intro h1 { font-size: clamp(32px, 4.5vw, 43px); margin: 6px 0 8px; }
.today-date { font-size: 12px; }
.session { max-width: 760px; }
.session-meta { margin-bottom: 10px; }
.flashcard { min-height: 280px; padding: 25px 32px; border-radius: 18px; box-shadow: 0 10px 26px rgba(50, 74, 47, .06); }
.flashcard.revealed { min-height: 0; }
.card-guidance { color: #637869; font-size: 13px; font-weight: 700; letter-spacing: .02em; text-align: center; }
.word-content { margin: auto 0; }
.word-content h2 { font-size: clamp(46px, 8vw, 76px); margin: 28px 0; }
.flashcard.revealed .word-content { margin: 8px 0 14px; }
.flashcard.revealed .word-content h2 { margin: 8px 0 10px; font-size: clamp(40px, 7vw, 64px); }
.answer { max-width: 610px; width: 100%; margin: 0 auto; padding-top: 18px; text-align: center; }
.answer-label { color: #617e64; }
.meaning { margin: 8px 0 12px; color: #243b2d; font-size: clamp(21px, 2.8vw, 26px); font-weight: 650; }
.answer-tools { display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap; }
.phonetic { margin: 0; color: #607466; font-size: 14px; }
.example-disclosure { margin-top: 18px; border-top: 1px solid #e5ebe1; padding-top: 14px; text-align: left; }
.example-disclosure summary { width: fit-content; margin: auto; color: var(--xl-brand); font-size: 13px; font-weight: 750; cursor: pointer; }
.example-disclosure summary:hover { text-decoration: underline; }
.example { margin-top: 14px; color: #526958; font-size: 14px; }
.study-actions { padding: 20px 0 8px; }
.reveal-button { min-width: 260px; justify-content: center; gap: 24px; }
.rate-prompt { font-size: 17px; margin-bottom: 15px; }
.rating-button, .rating-button.again, .rating-button.hard, .rating-button.good, .rating-button.easy { min-height: 98px; align-items: flex-start; border: 1px solid #c8d7c8; border-bottom: 2px solid #b8cbb9; background: #fffefa; color: var(--xl-ink); box-shadow: 0 2px 0 #e3ebe0; text-align: left; }
.rating-button:hover:not(:disabled) { background: #f2f7ef; border-color: #8eae93; transform: translateY(-2px); box-shadow: 0 4px 0 #d7e2d5; }
.rating-button:active:not(:disabled) { transform: translateY(1px); box-shadow: none; }
.rating-button kbd { align-self: flex-start; margin: 0 0 4px; background: #eaf1e8; border-color: #d2ddcf; }
.rating-button span { color: #607466; }
.rating-note { color: #667b6b; line-height: 1.5; }
button:focus-visible { outline: 3px solid #d6a24d; outline-offset: 3px; }

/* 双面共用网格高度，长释义与展开的例句由页面自然承载。 */
.flashcard, .flashcard.revealed {
  display: block;
  min-height: 390px;
  padding: 0;
  border: 0;
  border-radius: 22px;
  background: transparent;
  box-shadow: none;
  perspective: 1200px;
}
.card-inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  transform-style: preserve-3d;
  transition: transform .62s cubic-bezier(.2, .7, .2, 1);
}
.flashcard.revealed .card-inner { transform: rotateY(180deg); }
.card-face {
  position: relative;
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  min-height: 390px;
  padding: 30px 36px;
  border: 1px solid #d8e2d3;
  border-radius: 22px;
  background: #fffef9;
  box-shadow: 0 18px 42px #29463116;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.card-front { background: radial-gradient(circle at 50% 36%, #f5f8ef, #fffef9 66%); }
.card-back { transform: rotateY(180deg); border-color: #c9d9c8; background: #f9fbf6; }
.face-top { display: flex; justify-content: space-between; align-items: center; color: #6e886e; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.face-top span:last-child { color: #9aab99; font: 600 13px Georgia, serif; letter-spacing: .06em; }
.front-focus { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; min-height: 0; text-align: center; }
.front-focus h2 { max-width: 100%; margin: 0; color: #234a34; font: 500 clamp(46px, 8vw, 78px)/1.12 Georgia, 'Times New Roman', serif; letter-spacing: -.045em; overflow-wrap: anywhere; }
.front-rule { width: 48px; height: 2px; margin: 24px 0 15px; border-radius: 2px; background: #aac4a9; }
.front-focus p { margin: 0; color: #7e9180; font-size: 13px; }
.back-content { display: flex; flex: 1 0 auto; flex-direction: column; padding: 28px 8px 4px 0; }
.back-content h2 { margin: 0 0 9px; color: #27503a; font: 500 clamp(30px, 4.4vw, 44px)/1.15 Georgia, 'Times New Roman', serif; letter-spacing: -.035em; overflow-wrap: anywhere; }
.answer-tools { justify-content: flex-start; gap: 12px; }
.definition-section { margin: auto 0; padding: 23px 0; }
.answer-label { display: block; margin-bottom: 10px; padding: 0; border: 0; color: #789078; font-size: 11px; font-weight: 750; letter-spacing: .12em; }
.definition-list { border-top: 1px solid #dfe8dc; }
.definition-row { display: grid; grid-template-columns: 66px minmax(0, 1fr); align-items: start; gap: 18px; padding: 15px 0; border-bottom: 1px solid #e5ece2; }
.definition-row.without-pos { grid-template-columns: minmax(0, 1fr); }
.part-of-speech { width: fit-content; margin-top: 3px; padding: 4px 8px; border-radius: 5px; background: #e9f0e7; color: #4c7354; font: 700 12px/1.2 Georgia, serif; white-space: nowrap; }
.meaning { margin: 0; color: #293f30; font-size: clamp(19px, 2.5vw, 23px); font-weight: 500; line-height: 1.55; white-space: normal; overflow-wrap: anywhere; }
.definition-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; margin-top: 8px; padding: 2px 0; border: 0; background: transparent; color: #315b40; font-size: 12px; font-weight: 750; }
.definition-toggle:hover { text-decoration: underline; }
.definition-toggle span { font-size: 15px; font-weight: 400; }
.phonetic { color: #647b69; }
.example-disclosure { margin-top: 0; }
.example-disclosure summary { margin: 0; }
.answer-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
.issue-link { min-height: 40px; padding: 8px 0 8px 12px; border: 0; background: transparent; color: #778a79; font-size: 12px; font-weight: 500; cursor: pointer; }
.issue-link:hover { color: #315b40; text-decoration: underline; }
.issue-link:focus-visible { outline: 3px solid #bd914d; outline-offset: 3px; border-radius: 3px; }
.study-actions { padding: 22px 0 8px; }
.reveal-button { min-width: 260px; }
.rate-prompt { margin-bottom: 12px; font-size: 15px; }
.rating-grid { gap: 10px; }
.rating-button, .rating-button.again, .rating-button.hard, .rating-button.good, .rating-button.easy {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-content: center;
  column-gap: 8px;
  row-gap: 2px;
  min-height: 77px;
  padding: 11px 12px;
  border: 1px solid #d8e1d4;
  border-left: 3px solid var(--rating-accent);
  border-radius: 11px;
  background: #fffef9;
  box-shadow: 0 2px 0 #e6ece3;
}
.rating-button.again { --rating-accent: #bb806b; }
.rating-button.hard { --rating-accent: #c3a16a; }
.rating-button.good { --rating-accent: #83a785; }
.rating-button.easy { --rating-accent: #477e5d; }
.rating-button kbd { grid-row: span 2; align-self: center; margin: 0; text-align: center; }
.rating-button strong { font-size: 15px; line-height: 1.3; }
.rating-button span { font-size: 11px; line-height: 1.4; }
.rating-button:hover:not(:disabled) { background: #f6f9f3; }
.followup-flow { max-width: 620px; margin: 0 auto; padding: 18px 22px 20px; border: 1px solid #d7e2d2; border-radius: 16px; background: #f7faf4; text-align: left; }
.followup-label { display: block; color: #356b48; font-size: 13px; font-weight: 800; }
.followup-flow p { margin: 10px 0 17px; color: #526b58; font-size: 14px; line-height: 1.65; }
.followup-flow .primary-button { width: 100%; }
.followup-actions { display: flex; gap: 10px; }
.followup-actions .primary-button { flex: 1; width: auto; }
.context-question { padding: 8px 12px; margin: 12px 0; border-left: 3px solid #88a58a; background: #fffefa; }
.context-question .text-button { min-height: 44px; flex: 1; }
.echo-returned { animation: echo-return .35s ease-out both; }
@keyframes echo-return { from { opacity: .65; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.followup-example > span { color: #607b63; font-size: 12px; font-weight: 750; }
.complete-panel { position: relative; padding: 0; overflow: hidden; border-color: #d7e2d2; border-radius: 24px; background: #fffefa; box-shadow: 0 14px 36px #2946310d; text-align: left; }
.complete-panel.has-next-review { display: grid; grid-template-columns: minmax(0, 1fr) 280px; grid-template-rows: auto auto 1fr auto; column-gap: 22px; }
.has-next-review .completion-heading { grid-column: 1; grid-row: 1; padding-right: 0; }
.has-next-review .echo-reminder, .has-next-review .completion-hint { grid-column: 1; grid-row: 2; margin-right: 0; }
.has-next-review .next-review { grid-column: 2; grid-row: 1 / 4; align-self: stretch; flex-direction: column; gap: 16px; margin: 34px 34px 28px 0; padding: 22px; background: #f3f7ef; }
.has-next-review .next-review-icon { flex: 0 0 36px; }
.has-next-review .complete-actions { grid-column: 1; grid-row: 3; align-self: end; margin-right: 0; }
.has-next-review .completion-stats { grid-column: 1 / -1; grid-row: 4; }
.complete-panel.is-checked-in { border-color: #c4d9c2; background: radial-gradient(circle at 92% 0, #e7f1e3 0, #fffefa 42%); }
.complete-panel.is-checked-in::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #46784e, #9dbd87 64%, #d8bd7a); }
.completion-heading { display: flex; align-items: flex-start; gap: 20px; padding: 38px 40px 0; }
.complete-panel .complete-mark { flex: 0 0 54px; width: 54px; height: 54px; margin: 0; background: #eef2e9; color: #5f7e62; font-size: 27px; }
.complete-panel.is-checked-in .complete-mark { background: #d9ead5; color: #2d7044; box-shadow: 0 0 0 7px #e6f0e240; animation: completion-arrive .5s cubic-bezier(.2,.8,.2,1) both; }
@keyframes completion-arrive { from { transform: scale(.7) rotate(-16deg); opacity: .4; } to { transform: scale(1) rotate(0); opacity: 1; } }
.completion-copy { min-width: 0; }
.completion-eyebrow { display: block; margin: 0 0 6px; color: #5b8060; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.complete-panel h2 { margin: 0 0 8px; color: #203c2b; font-size: clamp(27px, 3.5vw, 34px); line-height: 1.3; letter-spacing: -.03em; }
.complete-panel p { margin: 0; color: #647968; font-size: 14px; line-height: 1.65; }
.complete-panel .check-in-note { color: #3d7650 !important; font-weight: 650; }
.echo-reminder { display: flex; align-items: flex-start; gap: 11px; margin: 25px 40px 0; padding: 12px 15px; border-left: 3px solid #c7d7bf; background: #f7f9f3; border-radius: 0 10px 10px 0; }
.echo-reminder-symbol { color: #6e9471; font-size: 18px; line-height: 1.3; }
.echo-reminder p { display: flex; flex-wrap: wrap; gap: 3px 9px; }
.echo-reminder strong { color: #385e42; font-size: 13px; }
.echo-reminder span:last-child { color: #708373; font-size: 12px; }
.next-review { display: flex; align-items: flex-start; gap: 14px; margin: 26px 40px 0; padding: 16px 18px; border: 1px solid #e1e8dc; border-radius: 14px; background: #f5f7f0; }
.next-review-icon { flex: 0 0 36px; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: #e7eee2; color: #4d7954; font-size: 22px; line-height: 1; }
.next-review-label { display: block; margin: 0 0 2px; color: #6e876f; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
.complete-panel .next-review p { color: #284b34; font: 700 21px/1.3 Georgia, 'Songti SC', serif; }
.next-review small { display: block; margin-top: 4px; color: #667e69; font-size: 13px; line-height: 1.5; font-variant-numeric: tabular-nums; }
.complete-panel .completion-hint { margin: 24px 40px 0; }
.complete-panel .complete-actions { justify-content: flex-start; margin: 24px 40px 30px; }
.complete-panel .complete-actions button { min-height: 46px; }
.completion-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid #edf0e7; background: #fbfcf8; }
.completion-stats > div { display: flex; flex-direction: row; align-items: baseline; justify-content: center; gap: 8px; min-width: 0; padding: 13px 8px; border-right: 1px solid #edf0e7; }
.completion-stats > div:last-child { border-right: 0; }
.completion-stats strong { color: #45684b; font: 600 20px/1.1 Georgia, 'Songti SC', serif; font-variant-numeric: tabular-nums; }
.completion-stats strong small { margin-left: 2px; font: 600 11px/1 'Noto Sans SC', 'Microsoft YaHei', sans-serif; }
.completion-stats span { color: #637969; font-size: 12px; }
@media (max-width: 760px) {
  .complete-panel.has-next-review { display: block; }
  .has-next-review .completion-heading { padding-right: 40px; }
  .has-next-review .echo-reminder, .has-next-review .completion-hint { margin-right: 40px; }
  .has-next-review .next-review { flex-direction: row; align-self: auto; gap: 14px; margin: 26px 40px 0; padding: 16px 18px; }
  .has-next-review .complete-actions { margin-right: 40px; }
}
@media (max-width: 640px) {
  .review-transition { min-height: 365px; }
  .study-page { padding: 14px 14px 60px; }
  .study-header { align-items: flex-start; flex-direction: column; gap: 4px; }
  .intro { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'title date' 'subtitle subtitle'; align-items: center; column-gap: 10px; row-gap: 6px; padding: 18px 0 20px; }
  .intro > div:first-child { display: contents; }
  .intro h1 { grid-area: title; font-size: 31px; margin: 0; }
  .intro .study-subtitle { grid-area: subtitle; margin: 0; font-size: 13px; }
  .today-date { grid-area: date; margin: 0; font-size: 11px; }
  .session-meta { align-items: flex-start; gap: 10px; font-size: 12px; }
  .session-counts { max-width: 75%; line-height: 1.5; }
  .flashcard, .flashcard.revealed, .card-face { min-height: 365px; }
  .card-face { padding: 22px; border-radius: 18px; }
  .front-focus h2 { font-size: clamp(40px, 10vw, 60px); }
  .back-content { padding-top: 22px; }
  .definition-section { padding: 18px 0; }
  .definition-row { grid-template-columns: 55px minmax(0, 1fr); gap: 10px; padding: 12px 0; }
  .meaning { font-size: 19px; }
  .rating-grid { grid-template-columns: repeat(2, 1fr); gap: 9px; }
  .followup-flow { padding: 16px; }
  .followup-actions { flex-direction: column; }
  .complete-actions { flex-direction: column; align-items: stretch; }
  .complete-actions button { width: 100%; }
  .complete-panel { border-radius: 20px; }
  .has-next-review .completion-heading { padding-right: 20px; }
  .has-next-review .echo-reminder, .has-next-review .completion-hint { margin-right: 20px; }
  .has-next-review .next-review { gap: 10px; margin: 20px 20px 0; padding: 13px; }
  .has-next-review .complete-actions { margin-right: 20px; }
  .completion-heading { gap: 13px; padding: 24px 20px 0; }
  .complete-panel .complete-mark { flex-basis: 44px; width: 44px; height: 44px; font-size: 23px; }
  .completion-eyebrow { margin-bottom: 5px; font-size: 10px; }
  .complete-panel h2 { margin-bottom: 7px; font-size: clamp(22px, 6vw, 28px); line-height: 1.35; }
  .complete-panel p { font-size: 13px; }
  .echo-reminder { margin: 20px 20px 0; padding: 10px 12px; }
  .echo-reminder p { display: block; }
  .echo-reminder strong { display: block; }
  .next-review { gap: 10px; margin: 20px 20px 0; padding: 13px; }
  .next-review-icon { flex-basis: 32px; width: 32px; height: 32px; font-size: 20px; }
  .complete-panel .next-review p { font-size: 19px; }
  .next-review small { font-size: 12px; }
  .complete-panel .completion-hint { margin: 20px 20px 0; }
  .complete-panel .complete-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin: 20px 20px 22px; }
  .complete-panel .complete-actions button { width: 100%; min-height: 44px; padding: 9px 6px; font-size: 13px; }
  .complete-panel .complete-actions button:first-child { grid-column: 1 / -1; min-height: 48px; }
  .completion-stats > div { flex-direction: column-reverse; align-items: center; gap: 4px; padding: 12px 5px; }
  .completion-stats strong { font-size: 18px; }
  .completion-stats span { font-size: 10px; }
}
@media (max-width: 360px) {
  .study-page { padding-bottom: 120px; }
}
@media (prefers-reduced-motion: reduce) {
  .complete-panel.is-checked-in .complete-mark { animation: none; }
  .transition-card-back, .transition-card-front, .transition-orbit, .transition-trail span { animation: none; }
  .echo-returned { animation: none; }
  .card-inner, .reveal-button, .primary-button, .text-button, .audio-button, .rating-button { transition: none; }
  .reveal-button:hover, .primary-button:hover, .text-button:hover, .rating-button:hover,
  .reveal-button:active, .primary-button:active, .text-button:active, .rating-button:active { transform: none; }
}
</style>
