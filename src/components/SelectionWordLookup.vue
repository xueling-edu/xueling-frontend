<template>
  <div ref="root" class="selection-word-lookup"><slot /></div>
  <Teleport to="body">
    <div v-if="word" ref="popup" class="selection-lookup-popover" :style="position" role="status" @pointerdown.prevent>
      <div class="selection-lookup-heading">
        <strong>{{ result?.word || word }}</strong>
        <button type="button" :aria-label="`播放 ${word} 的读音`" @click="playWord">♫ <span>发音</span></button>
        <button type="button" class="selection-lookup-close" aria-label="关闭释义" @click="close">×</button>
      </div>
      <small v-if="result?.phonetic">/{{ result.phonetic }}/</small>
      <p v-if="loading" class="selection-lookup-note">正在查词…</p>
      <p v-else-if="error" class="selection-lookup-note">{{ error }}</p>
      <div v-else-if="result" class="selection-lookup-definitions">
        <p v-for="(item, index) in result.translations.slice(0, 3)" :key="index"><em>{{ item.pos }}</em>{{ item.meanings.join('；') }}</p>
        <p v-if="!result.translations.length" class="selection-lookup-note">暂无释义</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { translateText } from '@/api/translate'
import type { TranslateResult } from '@/types/translate'
import { speakEnglishWord } from '@/utils/wordSpeech'

const props = withDefaults(defineProps<{ protectedWords?: string[] }>(), { protectedWords: () => [] })
const root = ref<HTMLElement | null>(null)
const popup = ref<HTMLElement | null>(null)
const word = ref('')
const result = ref<TranslateResult | null>(null)
const loading = ref(false)
const error = ref('')
const position = ref({ left: '0px', top: '0px', transform: 'translateX(-50%)' })
let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

function close() {
  requestId++
  word.value = ''
  result.value = null
  loading.value = false
  error.value = ''
}

function onSelectionChange() {
  clearTimeout(timer)
  timer = setTimeout(readSelection, 180)
}

function readSelection() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount || !root.value) { close(); return }
  const range = selection.getRangeAt(0)
  if (!root.value.contains(range.startContainer) || !root.value.contains(range.endContainer)) { close(); return }
  const selected = selection.toString().trim()
  // A phrase or sentence can expose an exercise answer, so this control only looks up one word.
  if (!/^[a-z]+(?:['’-][a-z]+)*$/i.test(selected)) { close(); return }
  const normalized = selected.normalize('NFKC').toLocaleLowerCase('en')
  if (props.protectedWords.some(item => item.normalize('NFKC').toLocaleLowerCase('en') === normalized)) { close(); return }
  const rect = range.getBoundingClientRect()
  if (!rect.width && !rect.height) return
  const above = rect.bottom + 170 > window.innerHeight && rect.top > 170
  const halfWidth = Math.min(290, window.innerWidth - 24) / 2
  position.value = {
    left: `${Math.max(12 + halfWidth, Math.min(rect.left + rect.width / 2, window.innerWidth - 12 - halfWidth))}px`,
    top: `${above ? Math.max(12, rect.top - 10) : rect.bottom + 10}px`,
    transform: above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
  }
  if (word.value.toLocaleLowerCase('en') === normalized) return
  word.value = selected
  result.value = null
  error.value = ''
  loading.value = true
  const current = ++requestId
  void translateText(selected).then(response => {
    if (current !== requestId) return
    if (response.code === 0 && response.data) result.value = response.data
    else error.value = response.msg || '暂时查不到这个词'
  }).catch(() => {
    if (current === requestId) error.value = '查词失败，请稍后重试'
  }).finally(() => {
    if (current === requestId) loading.value = false
  })
}

function onPointerDown(event: PointerEvent) {
  if (popup.value?.contains(event.target as Node)) return
  close()
}

function playWord() { speakEnglishWord(word.value, message => { error.value = message }) }

watch(() => props.protectedWords, () => {
  if (word.value && props.protectedWords.some(item => item.toLocaleLowerCase('en') === word.value.toLocaleLowerCase('en'))) close()
})
onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('scroll', close, true)
})
onUnmounted(() => {
  clearTimeout(timer)
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('scroll', close, true)
  close()
})
</script>

<style scoped>
.selection-word-lookup { min-width: 0; }
.selection-lookup-popover { position: fixed; z-index: 3000; width: min(290px, calc(100vw - 24px)); max-height: min(260px, 50vh); overflow: auto; box-sizing: border-box; padding: 15px 17px; border: 1px solid #cbdcc8; border-radius: 14px; background: #fffefa; color: #264633; box-shadow: 0 14px 38px #203d2629; font: 14px/1.5 var(--xl-font-body, sans-serif); }
.selection-lookup-heading { display: flex; align-items: center; gap: 9px; }
.selection-lookup-heading strong { min-width: 0; flex: 1; overflow-wrap: anywhere; font: 700 20px Georgia, serif; }
.selection-lookup-heading button { border: 0; background: none; color: #326c47; cursor: pointer; font: inherit; white-space: nowrap; }
.selection-lookup-heading .selection-lookup-close { font-size: 22px; line-height: 1; color: #7b8d7d; }
.selection-lookup-popover small { color: #728675; }
.selection-lookup-definitions { margin-top: 10px; }
.selection-lookup-definitions p { margin: 6px 0; overflow-wrap: anywhere; }
.selection-lookup-definitions em { margin-right: 8px; color: #477754; font-size: 12px; font-style: normal; font-weight: 700; }
.selection-lookup-note { margin: 10px 0 0; color: #778979; }
</style>
