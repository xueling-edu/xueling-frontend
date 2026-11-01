<script setup lang="ts">
import { computed } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import { usePreferencesStore } from '@/stores/preferences'

const preferencesStore = usePreferencesStore()
const wordLookupEnabled = computed({
  get: () => preferencesStore.preferences.wordLookupEnabled,
  set: value => preferencesStore.setPreference('wordLookupEnabled', value),
})

const sections = [
  { id: 'learning-tools', label: '学习工具', number: '01' },
  { id: 'account', label: '账户与帮助', number: '02' },
]
</script>

<template>
  <main class="settings-page">
    <div class="xl-page-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '设置' }]"
        title="设置"
        description="调整学习工具，管理个人资料。"
      />

      <div class="settings-layout">
        <nav class="settings-nav" aria-label="设置分类">
          <p class="nav-heading">设置分类</p>
          <a v-for="section in sections" :key="section.id" :href="`#${section.id}`">
            <span class="nav-number">{{ section.number }}</span>
            <span>{{ section.label }}</span>
          </a>
          <p class="nav-note">更改会立即生效，并保存在此浏览器中。</p>
        </nav>

        <div class="settings-content">
          <section id="learning-tools" class="settings-section" aria-labelledby="tools-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">01 / LEARNING TOOLS</p>
                <h2 id="tools-title">学习工具</h2>
                <p>决定哪些辅助工具出现在学习页面。</p>
              </div>
              <span class="section-glyph" aria-hidden="true">Aa</span>
            </div>

            <div class="setting-row">
              <div class="setting-icon" aria-hidden="true">
                <svg viewBox="0 0 28 28" fill="none"><path d="M5 6.5h14a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3v-18Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 21.5a3 3 0 0 1 3-3h14M10 12h7M10 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div class="setting-copy">
                <h3>单词查询悬浮窗</h3>
                <p>在页面右下角显示查词入口，随时打开单词释义。</p>
                <span class="setting-state">{{ wordLookupEnabled ? '当前已开启' : '当前已关闭' }}</span>
              </div>
              <el-switch v-model="wordLookupEnabled" size="large" aria-label="单词查询悬浮窗" />
            </div>
            <p class="section-footnote">关闭后，悬浮入口会立即隐藏；再次开启即可恢复。</p>
            <router-link class="account-link learning-settings-link" :to="{ path: '/english/vocab/study', query: { settings: '1' } }">
              <span>
                <strong>每日学习计划</strong>
                <small>调整新词上限、目标记忆率和时区</small>
              </span>
              <span class="link-arrow" aria-hidden="true">→</span>
            </router-link>
          </section>

          <section id="account" class="settings-section" aria-labelledby="account-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">02 / ACCOUNT & HELP</p>
                <h2 id="account-title">账户与帮助</h2>
                <p>管理个人资料，或告诉我们你的想法。</p>
              </div>
              <span class="section-glyph section-glyph-account" aria-hidden="true">◎</span>
            </div>
            <router-link class="account-link" to="/user/profile">
              <span>
                <strong>个人资料</strong>
                <small>修改头像、用户名及个人简介</small>
              </span>
              <span class="link-arrow" aria-hidden="true">→</span>
            </router-link>
            <router-link class="account-link feedback-link" :to="{ path: '/feedback', query: { from: '/settings' } }">
              <span>
                <strong>意见反馈</strong>
                <small>报告问题，分享想法，也能查看处理进度</small>
              </span>
              <span class="link-arrow" aria-hidden="true">→</span>
            </router-link>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.settings-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); align-items: start; gap: 32px; }
.settings-nav { position: sticky; top: 28px; display: grid; gap: 6px; padding: 20px 14px; border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); background: var(--xl-surface); }
.nav-heading { padding: 0 12px 12px; color: var(--xl-ink-soft); font-size: 12px; font-weight: 750; }
.settings-nav a { display: flex; align-items: center; gap: 11px; min-height: 43px; padding: 0 12px; border-radius: 9px; color: var(--xl-ink); font-size: 14px; font-weight: 750; text-decoration: none; transition: background .18s ease; }
.settings-nav a:hover, .settings-nav a:focus-visible { background: var(--xl-surface-muted); }
.nav-number { color: #7b947e; font: 600 12px var(--xl-font-display); }
.nav-note { margin: 18px 12px 0; padding-top: 17px; border-top: 1px solid var(--xl-border); color: var(--xl-ink-soft); font-size: 12px; line-height: 1.7; }
.settings-content { display: grid; gap: 20px; min-width: 0; }
.settings-section { scroll-margin-top: 24px; padding: 28px 30px 24px; border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); background: var(--xl-surface); }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding-bottom: 25px; border-bottom: 1px solid var(--xl-border); }
.eyebrow { color: #65826c; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.section-heading h2 { margin-top: 8px; font: 650 27px/1.2 var(--xl-font-display); }
.section-heading p:last-child { margin-top: 8px; color: var(--xl-ink-soft); font-size: 13px; line-height: 1.55; }
.section-glyph { flex: none; display: grid; place-items: center; width: 54px; height: 54px; border: 1px solid #cee0cb; border-radius: 14px; background: #e7efe4; color: var(--xl-brand); font: italic 25px var(--xl-font-display); }
.section-glyph-account { border-color: #eadbbf; background: #f6efdf; color: #8c682f; font: 35px/1 var(--xl-font-display); }
.setting-row { display: flex; align-items: center; gap: 18px; min-height: 128px; padding: 22px 0; }
.setting-icon { flex: none; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: var(--xl-surface-muted); color: var(--xl-brand); }
.setting-icon svg { width: 27px; height: 27px; }
.setting-copy { flex: 1; min-width: 0; }
.setting-copy h3 { font-size: 15px; font-weight: 800; }
.setting-copy p { margin-top: 5px; color: var(--xl-ink-soft); font-size: 13px; line-height: 1.6; }
.setting-state { display: inline-block; margin-top: 9px; color: var(--xl-brand); font-size: 11px; font-weight: 750; }
.section-footnote { padding-top: 17px; border-top: 1px solid var(--xl-border); color: var(--xl-ink-soft); font-size: 12px; line-height: 1.6; }
.account-link { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 84px; color: var(--xl-ink); text-decoration: none; }
.learning-settings-link { margin-top: 18px; border-top: 1px solid var(--xl-border); }
.feedback-link { border-top: 1px solid var(--xl-border); }
.account-link > span:first-child { display: grid; gap: 6px; }
.account-link strong { font-size: 15px; }
.account-link small { color: var(--xl-ink-soft); font-size: 13px; }
.link-arrow { color: var(--xl-brand); font-size: 23px; transition: transform .18s ease; }
.account-link:hover .link-arrow { transform: translateX(3px); }
.account-link:focus-visible, .settings-nav a:focus-visible { outline: 3px solid var(--xl-accent); outline-offset: 3px; }
@media (max-width: 760px) {
  .settings-layout { grid-template-columns: 1fr; gap: 16px; }
  .settings-nav { display: none; }
  .settings-section { padding: 24px 20px 20px; }
}
@media (max-width: 480px) {
  .section-glyph { width: 46px; height: 46px; font-size: 22px; }
  .setting-row { gap: 12px; }
  .setting-icon { display: none; }
  .setting-row :deep(.el-switch) { flex: none; }
}
@media (prefers-reduced-motion: reduce) { .link-arrow { transition: none; } }
</style>
