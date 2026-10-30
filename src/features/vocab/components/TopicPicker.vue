<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const topics = [
  { value: '', label: '不设置', detail: '只依据所选单词生成', code: '00' },
  { value: '日常生活', label: '日常生活', detail: '身边的人与日常片段', code: '01' },
  { value: '校园与学习', label: '校园与学习', detail: '课堂、阅读与成长', code: '02' },
  { value: '旅行见闻', label: '旅行见闻', detail: '城市、旅途与新发现', code: '03' },
  { value: '科技与未来', label: '科技与未来', detail: '技术如何改变生活', code: '04' },
  { value: '自然与环境', label: '自然与环境', detail: '自然世界与环保议题', code: '05' },
  { value: '职场与成长', label: '职场与成长', detail: '协作、选择与挑战', code: '06' },
] as const

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const current = computed(() => topics.find(item => item.value === props.modelValue) ?? topics[0])

function optionButtons(): HTMLButtonElement[] {
  return [...(root.value?.querySelectorAll<HTMLButtonElement>('[data-topic-option]') ?? [])]
}

async function openMenu() {
  open.value = true
  await nextTick()
  const index = topics.findIndex(item => item.value === props.modelValue)
  optionButtons()[Math.max(index, 0)]?.focus()
}

function closeMenu() {
  open.value = false
  void nextTick(() => trigger.value?.focus())
}

function toggleMenu() {
  if (open.value) closeMenu()
  else void openMenu()
}

function selectTopic(value: string) {
  emit('update:modelValue', value)
  closeMenu()
}

function moveFocus(event: KeyboardEvent, direction: number) {
  event.preventDefault()
  const buttons = optionButtons()
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  buttons[(index + direction + buttons.length) % buttons.length]?.focus()
}

function handleOutside(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutside))
</script>

<template>
  <div ref="root" class="topic-picker" @keydown.esc.stop.prevent="closeMenu">
    <span id="topic-picker-label" class="picker-label">文章主题 <small>可选</small></span>
    <button
      ref="trigger"
      type="button"
      class="topic-trigger"
      :class="{ 'is-open': open }"
      aria-labelledby="topic-picker-label topic-current"
      aria-haspopup="listbox"
      :aria-expanded="open"
      aria-controls="topic-menu"
      @click="toggleMenu"
      @keydown.down.prevent="openMenu"
      @keydown.up.prevent="openMenu"
    >
      <span class="trigger-symbol" aria-hidden="true">{{ current.code }}</span>
      <span class="trigger-copy"><strong id="topic-current">{{ current.label }}</strong><small>{{ current.detail }}</small></span>
      <span class="trigger-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
    </button>

    <Transition name="topic-menu">
      <div v-if="open" id="topic-menu" class="topic-menu" role="listbox" aria-labelledby="topic-picker-label" @keydown.down="moveFocus($event, 1)" @keydown.up="moveFocus($event, -1)">
        <div class="menu-heading"><span>选择文章方向</span><small>SELECT A THEME</small></div>
        <button
          v-for="item in topics"
          :key="item.code"
          type="button"
          class="topic-option"
          :class="{ selected: modelValue === item.value, 'free-option': item.value === '' }"
          role="option"
          :aria-selected="modelValue === item.value"
          data-topic-option
          @click="selectTopic(item.value)"
        >
          <span class="option-number" aria-hidden="true">{{ item.code }}</span>
          <span class="option-copy"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
          <span class="option-check" aria-hidden="true">✓</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.topic-picker{position:relative;margin-top:32px;z-index:5}
.picker-label{display:flex;align-items:baseline;gap:8px;margin-bottom:10px;font-size:13px;font-weight:750;color:#2d4734}
.picker-label small{font-size:11px;font-weight:500;color:#748a78}
.topic-trigger{width:100%;min-height:76px;display:flex;align-items:center;gap:13px;padding:11px 13px;text-align:left;border:1px solid #b8ceb8;border-radius:13px;background:#fffefa;box-shadow:0 3px 0 rgba(42,75,47,.055),inset 0 1px 0 #fff;color:#244c33;cursor:pointer;transition:border-color .18s,background-color .18s,box-shadow .18s,transform .18s}
.topic-trigger:hover{border-color:#78a381;background:#fff;transform:translateY(-1px);box-shadow:0 5px 13px rgba(42,75,47,.1)}
.topic-trigger:focus-visible,.topic-trigger.is-open{outline:none;border-color:#285d3a;box-shadow:0 0 0 3px rgba(57,113,70,.18),0 6px 18px rgba(42,75,47,.11)}
.trigger-symbol{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:9px;background:#e7f0e4;color:#3e7450;font:700 12px/1 Georgia,serif;letter-spacing:.05em}
.trigger-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.trigger-copy strong{font:700 15px/1.2 var(--xl-font-display);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.trigger-copy small{font-size:11px;color:#788d7b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trigger-chevron{width:29px;height:29px;flex:none;display:grid;place-items:center;border:1px solid #d5e2d4;border-radius:50%;background:#f5f8f2;color:#376244;transition:transform .2s,background-color .2s}.trigger-chevron svg{width:17px;height:17px}.is-open .trigger-chevron{transform:rotate(180deg);background:#e4eee2}
.topic-menu{position:absolute;top:calc(100% + 10px);left:0;right:0;max-height:min(360px,50vh);overflow-y:auto;padding:11px;border:1px solid #c9d8c7;border-radius:15px;background:#fffefa;box-shadow:0 20px 45px rgba(21,52,30,.18),0 4px 12px rgba(21,52,30,.07);scrollbar-width:thin;scrollbar-color:#bfd2bd transparent}
.menu-heading{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:9px 9px 12px;border-bottom:1px solid #e5ebe1;margin-bottom:7px;color:#31563b;font-size:12px;font-weight:750}.menu-heading small{font-size:9px;letter-spacing:.12em;color:#8aa08e;font-weight:700}
.topic-option{width:100%;min-height:58px;display:flex;align-items:center;gap:12px;padding:8px 10px;border:1px solid transparent;border-radius:9px;background:transparent;text-align:left;color:#294835;cursor:pointer;transition:background-color .16s,border-color .16s}
.topic-option:hover,.topic-option:focus-visible{outline:none;background:#f0f6ed;border-color:#d4e4d1}.topic-option.selected{background:#eaf3e7;border-color:#c4dac1}.topic-option.free-option{margin-bottom:9px;position:relative}.topic-option.free-option::after{content:"";position:absolute;left:9px;right:9px;bottom:-6px;height:1px;background:#e4ebe2}
.option-number{width:35px;height:35px;flex:none;display:grid;place-items:center;border-radius:8px;background:#f2f5ef;color:#829a85;font:700 11px Georgia,serif}.selected .option-number{background:#d8e8d3;color:#39704a}
.option-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.option-copy strong{font:700 13px/1.2 var(--xl-font-display)}.option-copy small{font-size:10px;color:#7f9081}.option-check{width:20px;height:20px;flex:none;display:grid;place-items:center;border-radius:50%;background:#3a734d;color:#fff;font-size:11px;opacity:0;transform:scale(.8);transition:opacity .16s,transform .16s}.selected .option-check{opacity:1;transform:scale(1)}
.topic-menu-enter-active,.topic-menu-leave-active{transition:opacity .16s,transform .16s}.topic-menu-enter-from,.topic-menu-leave-to{opacity:0;transform:translateY(-6px)}
@media(max-width:600px){.topic-picker{margin-top:24px}.topic-menu{max-height:min(310px,45vh)}}
@media(prefers-reduced-motion:reduce){.topic-trigger,.trigger-chevron,.topic-option,.option-check,.topic-menu-enter-active,.topic-menu-leave-active{transition:none}}
</style>
