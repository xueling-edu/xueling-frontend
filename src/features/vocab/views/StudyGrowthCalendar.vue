<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getStudyCalendar } from '@/features/vocab/api'
import type { StudyCalendar, StudyCalendarDay } from '@/features/vocab/types'

const calendar = ref<StudyCalendar | null>(null)
const selectedDate = ref('')
const loading = ref(true)
const error = ref('')
const jumpOpen = ref(false)
const jumpYear = ref(0)
const jumpContainer = ref<HTMLElement | null>(null)
let requestSequence = 0

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const monthLabel = computed(() => {
  if (!calendar.value) return ''
  const [year, month] = calendar.value.month.split('-')
  return `${year} 年 ${Number(month)} 月`
})
const leadingCells = computed(() => {
  if (!calendar.value) return 0
  const [year, month] = calendar.value.month.split('-').map(Number)
  return (new Date(Date.UTC(year!, month! - 1, 1)).getUTCDay() + 6) % 7
})
const checkedThisMonth = computed(() => calendar.value?.days.filter(day => day.checkedIn).length ?? 0)
const selected = computed(() => calendar.value?.days.find(day => day.date === selectedDate.value) ?? null)
const canNext = computed(() => calendar.value !== null && calendar.value.month < calendar.value.today.slice(0, 7))
const currentMonth = computed(() => calendar.value?.today.slice(0, 7) ?? '')
const firstAllowedMonth = computed(() => currentMonth.value ? offsetMonth(currentMonth.value, -120) : '')
const canPrevious = computed(() => calendar.value !== null && calendar.value.month > firstAllowedMonth.value)
const canPreviousYear = computed(() => jumpYear.value > Number(firstAllowedMonth.value.slice(0, 4)))
const canNextYear = computed(() => jumpYear.value < Number(currentMonth.value.slice(0, 4)))
const monthChoices = computed(() => Array.from({ length: 12 }, (_, index) => {
  const month = `${jumpYear.value}-${String(index + 1).padStart(2, '0')}`
  return { number: index + 1, value: month,
    disabled: month < firstAllowedMonth.value || month > currentMonth.value }
}))

function offsetMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year!, number! - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function loadCalendar(month?: string) {
  const sequence = ++requestSequence
  loading.value = true
  error.value = ''
  try {
    const response = await getStudyCalendar(month)
    if (sequence !== requestSequence) return
    calendar.value = response.data
    selectedDate.value = response.data.days.find(day => day.date === response.data.today)?.date
      ?? [...response.data.days].reverse().find(day => day.checkedIn)?.date
      ?? response.data.days[0]?.date ?? ''
  } catch (cause: any) {
    if (sequence === requestSequence) error.value = cause?.msg || '成长日历暂时无法读取，请稍后重试。'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function moveMonth(offset: number) {
  if (calendar.value) void loadCalendar(offsetMonth(calendar.value.month, offset))
}

function toggleJump() {
  if (!calendar.value) return
  jumpYear.value = Number(calendar.value.month.slice(0, 4))
  jumpOpen.value = !jumpOpen.value
}

function jumpTo(month: string) {
  jumpOpen.value = false
  if (month !== calendar.value?.month) void loadCalendar(month)
}

function closeJumpOnOutsideClick(event: MouseEvent) {
  if (jumpOpen.value && !jumpContainer.value?.contains(event.target as Node)) jumpOpen.value = false
}

function formatTime(ms: number) {
  return ms < 60_000 ? `${Math.round(ms / 1000)} 秒` : `${Math.round(ms / 60_000)} 分钟`
}

function dayLabel(day: StudyCalendarDay) {
  const status = day.checkedIn ? '已打卡' : day.reviewCount > 0 ? '有学习记录，尚无打卡' : '无学习记录'
  return `${day.date}，${status}，回忆 ${day.reviewCount} 次，新词 ${day.newWords} 个`
}

onMounted(() => {
  void loadCalendar()
  document.addEventListener('click', closeJumpOnOutsideClick)
})
onUnmounted(() => { document.removeEventListener('click', closeJumpOnOutsideClick) })
</script>

<template>
  <section id="growth-calendar" class="growth-section" aria-labelledby="growth-title">
    <div class="section-copy">
      <div>
        <p class="eyebrow">A LITTLE, EVERY DAY / 每日生长</p>
        <h2 id="growth-title">把坚持，种成一片森林。</h2>
        <p>完成当前可学的记忆任务后自动打卡；稍后出现的复习卡不会取消打卡。每一片叶子，都是认真回忆过的一天。</p>
      </div>
      <div class="leaf-art" aria-hidden="true"><span class="stem"></span><span class="leaf leaf-one"></span><span class="leaf leaf-two"></span><span class="leaf leaf-three"></span></div>
    </div>

    <div v-if="loading && !calendar" class="calendar-state" role="status">正在翻开成长日历…</div>
    <div v-else-if="error && !calendar" class="calendar-state" role="alert">{{ error }} <button type="button" @click="loadCalendar()">重试</button></div>
    <div v-else-if="calendar" class="calendar-card" :class="{ 'is-loading': loading }">
      <div class="calendar-top">
        <div class="month-heading"><span>GROWTH JOURNAL</span><h3>{{ monthLabel }}</h3></div>
        <div class="month-controls" aria-label="切换月份">
          <div ref="jumpContainer" class="jump-wrap" @keydown.esc="jumpOpen = false">
            <button type="button" class="jump-trigger" aria-controls="month-jump-panel" :aria-expanded="jumpOpen"
              :disabled="loading" @click="toggleJump">跳转月份 <span aria-hidden="true">⌄</span></button>
            <div v-if="jumpOpen" id="month-jump-panel" class="jump-panel" aria-label="选择要查看的月份">
              <div class="jump-year">
                <button type="button" aria-label="上一年" :disabled="!canPreviousYear" @click="jumpYear--">←</button>
                <strong>{{ jumpYear }} 年</strong>
                <button type="button" aria-label="下一年" :disabled="!canNextYear" @click="jumpYear++">→</button>
              </div>
              <div class="jump-months">
                <button v-for="choice in monthChoices" :key="choice.value" type="button"
                  :aria-label="`${choice.value.slice(0, 4)} 年 ${choice.number} 月`"
                  :aria-pressed="choice.value === calendar.month" :disabled="choice.disabled"
                  @click="jumpTo(choice.value)">{{ choice.number }} 月</button>
              </div>
              <button type="button" class="jump-current" @click="jumpTo(currentMonth)">回到本月 ↗</button>
            </div>
          </div>
          <button type="button" aria-label="上个月" :disabled="loading || !canPrevious" @click="moveMonth(-1)">←</button>
          <button type="button" aria-label="下个月" :disabled="loading || !canNext" @click="moveMonth(1)">→</button>
        </div>
      </div>

      <div class="growth-stats" aria-label="成长数据">
        <div><strong>{{ calendar.currentStreak }}<small>天</small></strong><span>当前连续</span></div>
        <div><strong>{{ checkedThisMonth }}<small>天</small></strong><span>本月完成</span></div>
        <div><strong>{{ calendar.totalCheckIns }}<small>天</small></strong><span>累计打卡</span></div>
        <p>最长连续 {{ calendar.longestStreak }} 天。{{ calendar.checkedInToday ? '今天的叶子已点亮。' : '完成今日任务，点亮今天。' }}</p>
      </div>

      <div class="calendar-body">
        <div class="calendar-main">
          <div class="weekday-row" aria-hidden="true"><span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span></div>
          <div class="day-grid">
            <span v-for="index in leadingCells" :key="`blank-${index}`" class="blank-day" aria-hidden="true"></span>
            <button v-for="day in calendar.days" :key="day.date" type="button" class="day-cell"
              :class="{ checked: day.checkedIn, active: selectedDate === day.date, today: day.date === calendar.today, practiced: day.reviewCount > 0 && !day.checkedIn }"
              :disabled="day.date > calendar.today" :aria-label="dayLabel(day)" :aria-pressed="selectedDate === day.date"
              @click="selectedDate = day.date">
              <span class="day-number">{{ Number(day.date.slice(-2)) }}</span>
              <svg v-if="day.checkedIn" class="day-leaf" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19.5 4.5c-8.5-.2-14 3.8-14 9.3 0 2.8 1.8 4.7 4.5 4.7 5.7 0 9.5-5.7 9.5-14Z" fill="currentColor"/><path d="M5 20c3.5-5.4 7.1-8 11.7-10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span v-else-if="day.reviewCount > 0" class="activity-dot" aria-hidden="true"></span>
            </button>
          </div>
          <div class="legend"><span><i class="legend-leaf">◆</i> 已打卡</span><span><i class="legend-dot"></i> 有学习记录</span><span><i class="legend-today"></i> 今天</span></div>
        </div>

        <aside class="day-detail" aria-live="polite">
          <template v-if="selected">
            <span class="detail-kicker">DAY {{ selected.date.slice(-2) }}</span>
            <h4>{{ selected.date.slice(5).replace('-', ' 月 ') }} 日</h4>
            <div class="detail-symbol" :class="{ earned: selected.checkedIn }" aria-hidden="true">{{ selected.checkedIn ? '✦' : selected.reviewCount > 0 ? '◌' : '·' }}</div>
            <strong>{{ selected.checkedIn ? '这一天，已点亮' : selected.reviewCount > 0 ? selected.date === calendar.today ? '这一页，还在生长' : '这一天，留下了学习足迹' : selected.date === calendar.today ? '今天，等你开始' : '留白也是旅程的一部分' }}</strong>
            <p v-if="selected.checkedIn">完成当时可学的任务后，自动留下一片成长的叶子。</p>
            <p v-else-if="selected.reviewCount > 0">{{ selected.date === calendar.today ? '已有学习记录，继续完成当天任务即可打卡。' : '这天有学习记录，但没有打卡记录。' }}</p>
            <p v-else-if="selected.date === calendar.today">从一次认真回忆开始，写下今天的记录。</p>
            <p v-else>以自己的节奏，继续向前。</p>
            <dl v-if="selected.reviewCount > 0" class="detail-numbers">
              <div><dt>回忆</dt><dd>{{ selected.reviewCount }} 次</dd></div>
              <div><dt>新词</dt><dd>{{ selected.newWords }} 个</dd></div>
              <div><dt>用时</dt><dd>{{ formatTime(selected.studyTimeMs) }}</dd></div>
            </dl>
            <router-link v-if="selected.date === calendar.today && !selected.checkedIn" to="/english/vocab/study" class="study-action">继续今日学习 ↗</router-link>
          </template>
        </aside>
      </div>
      <p v-if="error" class="refresh-error" role="alert">{{ error }} <button type="button" @click="loadCalendar(calendar?.month)">重试</button></p>
    </div>
  </section>
</template>

<style scoped>
.growth-section { margin: 12px 0 42px; color: #223c2b; }
.section-copy { min-height: 175px; display: flex; justify-content: space-between; align-items: center; overflow: hidden; padding: 27px 36px; background: #234b35; color: #f9f7ec; border-radius: 18px 18px 0 0; position: relative; }
.section-copy::after { content: ''; position: absolute; inset: 0; opacity: .16; background: radial-gradient(circle at 80% 100%, #b5d088 0, transparent 35%), repeating-linear-gradient(125deg, transparent 0 32px, #dce5c5 33px, transparent 34px); pointer-events: none; }
.section-copy > div:first-child { position: relative; z-index: 1; }
.eyebrow, .month-heading span, .detail-kicker { font: 750 11px/1.4 Georgia, serif; letter-spacing: .16em; }
.eyebrow { color: #c9dbb6; margin: 0 0 13px; }
.section-copy h2 { font: 650 clamp(25px, 3vw, 35px)/1.2 Georgia, 'Songti SC', serif; margin: 0 0 9px; }
.section-copy p:last-child { color: #d9e5d2; font-size: 13px; line-height: 1.6; }
.leaf-art { flex: 0 0 160px; height: 125px; position: relative; z-index: 1; transform: rotate(-8deg); }
.stem { position: absolute; left: 78px; top: 18px; height: 124px; width: 3px; background: #afc894; border-radius: 9px; transform: rotate(24deg); }
.leaf { position: absolute; width: 55px; height: 29px; background: #afc894; border-radius: 100% 0 100% 0; box-shadow: inset 10px 5px 15px #d9eab14a; }
.leaf-one { top: 26px; left: 31px; transform: rotate(21deg); }.leaf-two { top: 59px; left: 81px; transform: rotate(77deg); }.leaf-three { top: 86px; left: 13px; transform: rotate(23deg); }
.calendar-card { border: 1px solid #dce2d1; border-top: 0; background: #fffef8; border-radius: 0 0 18px 18px; box-shadow: 0 16px 34px #2b483313; transition: opacity .2s; }
.calendar-card.is-loading { opacity: .55; pointer-events: none; }
.calendar-top { display: flex; align-items: center; justify-content: space-between; padding: 25px 35px 16px; }
.month-heading span { color: #829882; }.month-heading h3 { margin: 4px 0 0; font: 650 26px/1.2 Georgia, 'Songti SC', serif; }
.month-controls { display: flex; gap: 6px; }.month-controls button { width: 39px; height: 39px; border: 1px solid #d5ded0; border-radius: 9px; background: #f6f8f1; color: #315b40; font-size: 21px; cursor: pointer; }.month-controls button:hover:not(:disabled) { background: #e4eee1; }.month-controls button:disabled { opacity: .35; cursor: not-allowed; }
.jump-wrap { position: relative; }.month-controls .jump-trigger { width: auto; min-width: 108px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: space-between; gap: 8px; font: 750 12px 'Noto Sans SC', sans-serif; }.jump-trigger[aria-expanded="true"] { border-color: #739b78; background: #e7f0e2; }.jump-trigger span { font-size: 17px; line-height: 1; }
.jump-panel { position: absolute; right: 0; top: calc(100% + 9px); z-index: 5; width: 270px; padding: 16px; border: 1px solid #ceddcb; border-radius: 13px; background: #fffef8; box-shadow: 0 15px 35px #1d3c2a26; }.jump-year { display: flex; align-items: center; justify-content: space-between; margin-bottom: 13px; }.jump-year strong { font: 650 18px Georgia, 'Songti SC', serif; }.month-controls .jump-year button { width: 31px; height: 31px; font-size: 17px; }.jump-months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }.month-controls .jump-months button { width: 100%; height: 38px; font-size: 12px; font-weight: 750; }.month-controls .jump-months button[aria-pressed="true"] { background: #2d6340; border-color: #2d6340; color: #fff; }.month-controls .jump-months button:disabled { background: #f7f7f2; }.month-controls .jump-current { width: 100%; height: 34px; margin-top: 13px; border: 0; border-top: 1px solid #e2e9df; border-radius: 0; background: transparent; color: #356d45; font-size: 12px; font-weight: 750; text-align: right; }
.growth-stats { display: flex; align-items: stretch; margin: 0 35px 26px; border-bottom: 1px solid #e4e9de; padding: 5px 0 21px; gap: 31px; }.growth-stats div { min-width: 105px; display: flex; flex-direction: column; gap: 2px; }.growth-stats strong { font: 650 29px/1.1 Georgia, serif; color: #295b3a; }.growth-stats small { font: 600 13px/1.2 'Noto Sans SC', sans-serif; margin-left: 3px; }.growth-stats span { color: #779078; font-size: 12px; }.growth-stats p { margin: auto 0 auto auto; max-width: 210px; color: #68806d; font-size: 12px; line-height: 1.5; }
.calendar-body { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 26px; padding: 0 35px 31px; }.calendar-main { min-width: 0; }.weekday-row, .day-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }.weekday-row span { text-align: center; color: #8b9b8c; font-size: 11px; font-weight: 750; padding: 0 0 11px; }.day-grid { gap: 5px; }.day-cell, .blank-day { aspect-ratio: 1.27; min-height: 47px; }.day-cell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border: 1px solid transparent; border-radius: 10px; background: #f6f7f1; color: #657666; cursor: pointer; font: 600 15px Georgia, serif; transition: transform .15s ease, background .15s ease, border-color .15s ease; }.day-cell:hover:not(:disabled) { transform: translateY(-2px); border-color: #9cb69d; }.day-cell.active { outline: 2px solid #2d6340; outline-offset: 2px; }.day-cell.checked { background: #e0ebdc; color: #245539; }.day-cell.today { border-color: #be9b62; }.day-cell:disabled { background: transparent; opacity: .35; cursor: default; }.day-leaf { width: 20px; height: 20px; color: #448b54; }.activity-dot { width: 5px; height: 5px; background: #c39957; border-radius: 50%; }.legend { display: flex; gap: 20px; align-items: center; padding-top: 18px; color: #79907c; font-size: 11px; }.legend span { display: flex; align-items: center; gap: 6px; }.legend-leaf { color: #4c945b; font-style: normal; }.legend-dot { width: 6px; height: 6px; background: #c39957; border-radius: 50%; }.legend-today { width: 12px; height: 12px; border: 1px solid #be9b62; border-radius: 4px; }
.day-detail { min-height: 275px; border-left: 1px solid #e4e9de; padding: 3px 0 0 25px; }.detail-kicker { color: #a4b29f; }.day-detail h4 { margin: 5px 0 12px; font: 650 24px/1.2 Georgia, 'Songti SC', serif; }.detail-symbol { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; background: #f1f0e6; color: #a9b5a5; font: 30px Georgia, serif; margin-bottom: 13px; }.detail-symbol.earned { color: #fff9e3; background: #4a8b55; box-shadow: 0 0 0 6px #e2efdc; }.day-detail strong { display: block; font-size: 14px; }.day-detail p { margin: 7px 0 12px; color: #778a78; font-size: 12px; line-height: 1.6; }.detail-numbers { margin: 14px 0 0; border-top: 1px solid #e9eee5; }.detail-numbers div { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #e9eee5; font-size: 12px; }.detail-numbers dt { color: #7f9481; }.detail-numbers dd { margin: 0; font-weight: 750; }.study-action { display: inline-block; margin-top: 12px; color: #285f3a; font-size: 12px; font-weight: 800; text-decoration: none; }.study-action:hover { text-decoration: underline; }
.calendar-state { padding: 36px; background: #fffef8; border: 1px solid #dce2d1; border-radius: 0 0 18px 18px; color: #627867; }.calendar-state button, .refresh-error button { border: 0; color: #285f3a; background: none; font-weight: 750; cursor: pointer; }.refresh-error { padding: 0 35px 22px; color: #a5543e; font-size: 12px; }button:focus-visible, a:focus-visible { outline: 3px solid #b9975d; outline-offset: 3px; }
@media (max-width: 760px) { .section-copy { padding: 25px 22px; }.leaf-art { position: absolute; right: -25px; opacity: .35; }.section-copy > div:first-child { max-width: 90%; }.calendar-top { padding: 22px 20px 14px; gap: 12px; flex-wrap: wrap; }.month-controls { margin-left: auto; }.growth-stats { margin: 0 20px 23px; gap: 10px; justify-content: space-between; }.growth-stats div { min-width: 0; }.growth-stats strong { font-size: 23px; }.growth-stats p { display: none; }.calendar-body { display: block; padding: 0 18px 25px; }.day-grid { gap: 3px; }.day-cell, .blank-day { min-height: 40px; aspect-ratio: 1; }.day-leaf { width: 17px; height: 17px; }.day-detail { min-height: 0; margin-top: 22px; padding: 18px 3px 0; border-left: 0; border-top: 1px solid #e4e9de; }.detail-symbol { float: right; margin: -28px 8px 0 0; }.detail-numbers { display: flex; gap: 18px; }.detail-numbers div { flex: 1; }.legend { gap: 11px; flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { .day-cell, .calendar-card { transition: none; }.day-cell:hover:not(:disabled) { transform: none; } }
</style>
