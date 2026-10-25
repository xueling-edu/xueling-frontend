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

      <div v-if="loading" class="state-panel" role="status">正在整理今天的单词…</div>
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
      <div v-else-if="loadError && !followup" class="state-panel">
        <h2>暂时无法读取学习计划</h2>
        <p>{{ loadError }}</p>
        <button class="primary-button" type="button" @click="loadToday">重新加载</button>
      </div>

      <section v-else-if="currentCard" class="session" aria-label="学习卡片" aria-live="polite">
        <div class="session-meta">
          <span class="pill">{{ currentCard.newCard ? '新词' : '到期复习' }}</span>
          <span v-if="followup" class="session-counts">评分已保存 · 完成当前词的巩固后继续</span>
          <span v-else class="session-counts">今日已完成 {{ today!.todayReviewed }} 次 <i aria-hidden="true">·</i> 待复习 {{ today!.dueCount }} <i aria-hidden="true">·</i> 新词额度 {{ today!.newRemaining }}</span>
        </div>
        <div :key="`${currentCard.wordId}-${currentCard.version}`" class="flashcard" :class="{ revealed: cardRevealed }">
          <div class="card-inner">
            <div class="card-face card-front" :aria-hidden="cardRevealed">
              <div class="face-top"><span>{{ followup?.step === 'recall' ? '再回忆一次' : '回忆' }}</span><span>01 / 02</span></div>
              <div class="front-focus">
                <h2>{{ currentCard.word }}</h2>
                <span class="front-rule" aria-hidden="true"></span>
                <p>在心里说出它的中文释义</p>
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
                  <span class="answer-label">中文释义</span>
                  <div id="study-definition-list" class="definition-list">
                    <div v-for="(entry, index) in displayedMeaningEntries" :key="index" class="definition-row" :class="{ 'without-pos': !entry.pos }">
                      <span v-if="entry.pos" class="part-of-speech">{{ entry.pos }}</span>
                      <p class="meaning">{{ entry.text }}</p>
                    </div>
                  </div>
                  <button v-if="hasMoreMeaning" class="definition-toggle" type="button" aria-controls="study-definition-list" :aria-expanded="expandedMeaning" @click="expandedMeaning = !expandedMeaning">
                    {{ expandedMeaning ? '收起释义' : '展开完整释义' }} <span aria-hidden="true">{{ expandedMeaning ? '↑' : '↓' }}</span>
                  </button>
                </div>
                <div v-if="followup && currentCard.example" class="example-disclosure followup-example">
                  <span>例句与译文</span>
                  <div class="example">
                    <p>{{ currentCard.example }}</p>
                    <p v-if="currentCard.exampleTranslation">{{ currentCard.exampleTranslation }}</p>
                  </div>
                </div>
                <details v-else-if="currentCard.example" class="example-disclosure">
                  <summary>查看例句与译文</summary>
                  <div class="example">
                    <p>{{ currentCard.example }}</p>
                    <p v-if="currentCard.exampleTranslation">{{ currentCard.exampleTranslation }}</p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>

        <div class="study-actions">
          <div v-if="followup" class="followup-flow" aria-live="polite">
            <span class="followup-label">{{ followup.rating === 1 ? '忘记了 · 重新学习' : followup.rating === 2 ? '很困难 · 加深记忆' : '记得 · 语境巩固' }}</span>
            <template v-if="followup.step === 'study'">
              <p v-if="followup.rating === 1">先看清核心释义，确认刚才没有想起的意思。</p>
              <p v-else-if="followup.rating === 2">留意刚才费力才想起的释义{{ currentCard.example ? '，再结合例句确认用法' : '' }}。</p>
              <p v-else>读一遍释义{{ currentCard.example ? '和例句' : '' }}，确认这个词在语境中的意思。</p>
              <button v-if="followup.rating === 1" class="primary-button" type="button" @click="setFollowupStep('context')">{{ currentCard.example ? '下一步：听读与例句' : '下一步：听读练习' }}</button>
              <button v-else-if="followup.rating === 2" class="primary-button" type="button" @click="setFollowupStep('recall')">遮住答案，再回忆一次</button>
              <button v-else class="primary-button" type="button" @click="finishFollowup">下一个词</button>
            </template>
            <template v-else-if="followup.step === 'context'">
              <p>听发音，跟读这个词{{ currentCard.example ? '，再读一遍例句和译文' : '，再说一遍它的意思' }}。</p>
              <div class="followup-actions">
                <button class="text-button" type="button" @click="playAudio(currentCard.word)">♫ 听发音</button>
                <button class="primary-button" type="button" @click="setFollowupStep('recall')">遮住答案，再回忆一次</button>
              </div>
            </template>
            <template v-else-if="followup.step === 'recall'">
              <p>只看英文，在心里说出刚才的核心释义。</p>
              <button class="primary-button" type="button" @click="setFollowupStep('checked')">想好了，核对答案</button>
            </template>
            <template v-else>
              <p>核对完成。这次评分仍按第一次揭晓前的回忆记录，后续会按计划再复习。</p>
              <button class="primary-button" type="button" @click="finishFollowup">下一个词</button>
            </template>
          </div>
          <button v-else-if="!revealed" class="reveal-button" type="button" @click="reveal">已回忆，查看答案 <span aria-hidden="true">↗</span></button>
          <template v-else>
            <p class="rate-prompt">{{ saving ? '正在保存本次评分…' : '揭晓前，你回忆得怎么样？' }}</p>
            <div class="rating-grid">
              <button v-for="option in ratingOptions" :key="option.value" type="button" :disabled="saving"
                :class="['rating-button', option.className]" @click="rate(option.value)">
                <kbd>{{ option.value }}</kbd><strong>{{ option.label }}</strong><span>{{ option.hint }}</span>
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

      <section v-else class="state-panel complete-panel">
        <div class="complete-mark">{{ today?.checkedIn ? '✦' : '✓' }}</div>
        <h2>{{ today?.checkedIn ? '今日已自动打卡' : today?.todayReviewed ? '当前任务完成' : '暂时没有学习任务' }}</h2>
        <p v-if="today?.checkedIn" class="check-in-note">成长日历又点亮了一天。每一次认真回忆，都在让记忆扎根。</p>
        <p v-if="today?.nextDueAt">下一张卡片预计在 {{ formatDue(today.nextDueAt) }} 到期。</p>
        <p v-else-if="planState === 'unknown' && !today?.todayReviewed">尚未找到可学的单词，请检查词书计划或稍后重试。</p>
        <p v-else-if="today?.newRemaining && today.newRemaining > 0">当前启用的词书没有更多未学单词。</p>
        <p v-else>今天已完成 {{ today?.todayReviewed ?? 0 }} 次回忆，稍后回来看看新的到期卡片。</p>
        <div class="complete-actions">
          <button class="primary-button" type="button" @click="loadToday">检查新任务</button>
          <button class="text-button" type="button" @click="router.push('/english/vocab/insights#growth-calendar')">查看成长日历</button>
          <button class="text-button" type="button" @click="router.push('/english/vocab')">管理词书</button>
        </div>
      </section>

      <section v-if="today && !loading && !loadError && !currentCard && !pendingReview && planState !== 'none'" class="metrics" aria-label="今日学习概览">
        <div class="metric"><span>待复习</span><strong>{{ today.dueCount }}</strong></div>
        <div class="metric"><span>剩余新词额度</span><strong>{{ today.newRemaining }}</strong></div>
        <div class="metric"><span>今日已完成</span><strong>{{ today.todayReviewed }}</strong></div>
      </section>
    </div>

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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStudySettings, getTodayStudy, getWordBooks, submitStudyReview, updateStudySettings } from '@/features/vocab/api'
import type { StudyQueueCard, StudySettings, SubmitStudyReview, TodayStudy } from '@/features/vocab/types'
import { clearPendingReview, persistPendingReview, restorePendingReview } from '@/features/vocab/pendingReview'
import { clearFollowup, persistFollowup, restoreFollowup } from '@/features/vocab/followupStudy'
import type { FollowupStudy } from '@/features/vocab/followupStudy'
import { createReviewRequestId } from '@/features/vocab/requestId'
import { useUserStore } from '@/stores/user'
import PageBreadcrumb from '@/components/PageBreadcrumb.vue'

const router = useRouter()
const userStore = useUserStore()
const today = ref<TodayStudy | null>(null)
const planState = ref<'unknown' | 'none' | 'ready'>('unknown')
const loading = ref(true)
const loadError = ref('')
const revealed = ref(false)
const expandedMeaning = ref(false)
const saving = ref(false)
const saveError = ref('')
const canRefreshAfterError = ref(false)
const pendingReview = ref<SubmitStudyReview | null>(null)
const followup = ref<FollowupStudy | null>(null)
const shownAt = ref(Date.now())
const settingsOpen = ref(false)
const savingSettings = ref(false)
const settingsDraft = ref<StudySettings | null>(null)
const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
const timeZone = ref(deviceTimeZone)
const retentionPercent = computed({
  get: () => Math.round((settingsDraft.value?.desiredRetention ?? 0.9) * 100),
  set: value => { if (settingsDraft.value) settingsDraft.value.desiredRetention = value / 100 }
})
const currentCard = computed<StudyQueueCard | null>(() => followup.value?.card ?? today.value?.cards[0] ?? null)
const cardRevealed = computed(() => followup.value ? followup.value.step !== 'recall' : revealed.value)
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
  if (!hasMoreMeaning.value || expandedMeaning.value) return meaningEntries.value
  return meaningEntries.value.slice(0, MAX_PREVIEW_ROWS).map(entry => ({
    ...entry,
    text: entry.text.length > MAX_PREVIEW_CHARACTERS
      ? `${entry.text.slice(0, MAX_PREVIEW_CHARACTERS).trimEnd()}…`
      : entry.text
  }))
})
const dateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', {
  timeZone: timeZone.value, month: 'long', day: 'numeric', weekday: 'long'
}).format(new Date()))
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
    const response = await getTodayStudy()
    today.value = response.data
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
  if (event.altKey || event.ctrlKey || event.metaKey || settingsOpen.value || loading.value || pendingReview.value || followup.value) return
  const target = event.target
  if (target instanceof HTMLElement && (target.closest('button, input, textarea, select, [contenteditable="true"]'))) return
  if (!currentCard.value) return
  if (!revealed.value && event.code === 'Space') {
    event.preventDefault()
    reveal()
  } else if (revealed.value && !saving.value && /^[1-4]$/.test(event.key)) {
    event.preventDefault()
    rate(Number(event.key) as 1 | 2 | 3 | 4)
  }
}

function playAudio(word: string) {
  if (!('speechSynthesis' in window)) return ElMessage.warning('当前浏览器不支持语音播放')
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = 'en-US'
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

function rate(rating: 1 | 2 | 3 | 4) {
  if (!revealed.value || !currentCard.value || saving.value) return
  const review: SubmitStudyReview = {
    wordId: currentCard.value.wordId,
    rating,
    expectedVersion: currentCard.value.version,
    requestId: createReviewRequestId(),
    elapsedMs: Math.min(600_000, Date.now() - shownAt.value)
  }
  if (rating !== 4) {
    const nextFollowup: FollowupStudy = { requestId: review.requestId, rating, card: { ...currentCard.value }, step: 'study', confirmed: false }
    followup.value = nextFollowup
    persistFollowup(userStore.userInfo?.id, nextFollowup)
  }
  pendingReview.value = review
  persistPendingReview(userStore.userInfo?.id, review)
  void sendReview(review)
}

async function sendReview(review: SubmitStudyReview) {
  if (saving.value) return
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
      await loadToday()
    }
  } catch (error: any) {
    saveError.value = error?.msg || '评分未确认保存，请使用同一个请求重试。'
    canRefreshAfterError.value = error?.code === 500 || error?.code === 501
  } finally {
    saving.value = false
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

function finishFollowup() {
  clearFollowup(userStore.userInfo?.id)
  followup.value = null
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

function formatDue(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: timeZone.value, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

onMounted(async () => {
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
  window.removeEventListener('keydown', handleKeydown)
  window.speechSynthesis?.cancel()
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
.metrics { max-width: 800px; display: grid; grid-template-columns: repeat(3, 1fr); background: #e7ebe0; border: 1px solid #dce3d6; border-radius: 16px; margin: 30px auto 0; overflow: hidden; }
.metric { display: flex; flex-direction: column; gap: 6px; padding: 15px 24px; border-right: 1px solid #d2dcce; }
.metric:last-child { border-right: 0; }
.metric span { color: #617263; font-size: 12px; }.metric strong { font-size: 25px; line-height: 1; font-family: Georgia, serif; }
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
.followup-example > span { color: #607b63; font-size: 12px; font-weight: 750; }
@media (max-width: 640px) {
  .study-page { padding: 14px 14px 60px; }
  .study-header { align-items: flex-start; flex-direction: column; gap: 4px; }
  .intro { align-items: start; flex-direction: column; gap: 6px; padding: 18px 0; }
  .study-subtitle { font-size: 13px; }
  .metrics { margin-top: 22px; }
  .metric { padding: 16px 10px; text-align: center; }
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
}
@media (prefers-reduced-motion: reduce) {
  .card-inner, .reveal-button, .primary-button, .text-button, .audio-button, .rating-button { transition: none; }
  .reveal-button:hover, .primary-button:hover, .text-button:hover, .rating-button:hover,
  .reveal-button:active, .primary-button:active, .text-button:active, .rating-button:active { transform: none; }
}
</style>
