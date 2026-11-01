<script setup lang="ts">
import { computed } from 'vue'
import PageHeading from '@/components/PageHeading.vue'
import { usePreferencesStore } from '@/stores/preferences'

const preferencesStore = usePreferencesStore()
const wordLookupEnabled = computed({
  get: () => preferencesStore.preferences.wordLookupEnabled,
  set: value => preferencesStore.setPreference('wordLookupEnabled', value),
})
</script>

<template>
  <main class="settings-page">
    <div class="xl-page-shell settings-shell">
      <PageHeading
        :items="[{ label: '首页', to: '/' }, { label: '设置' }]"
        title="设置"
        description="让学习更符合你的习惯。"
      />

      <div class="settings-content">
        <section class="settings-group" aria-labelledby="learning-title">
          <div class="group-heading">
            <div>
              <p class="group-kicker">LEARNING</p>
              <h2 id="learning-title">学习偏好</h2>
            </div>
            <p>调整学习时使用的工具与计划</p>
          </div>

          <div class="settings-list">
            <div class="setting-item">
              <span class="item-icon icon-lookup" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 5.5h11.5A2.5 2.5 0 0 1 19 8v11H7.5A2.5 2.5 0 0 0 5 21V5.5Z" />
                  <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19M9 9h6M9 12h3" />
                </svg>
              </span>
              <div class="item-copy">
                <h3 id="lookup-label">单词查询悬浮窗</h3>
                <p id="lookup-description">在学习页面快速打开单词释义</p>
              </div>
              <el-switch
                v-model="wordLookupEnabled"
                class="setting-switch"
                size="large"
                aria-labelledby="lookup-label"
                aria-describedby="lookup-description"
              />
            </div>

            <router-link class="setting-item setting-link" :to="{ path: '/english/vocab/study', query: { settings: '1' } }">
              <span class="item-icon icon-plan" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
                  <path d="M8 3.5v4M16 3.5v4M4 10h16M8 15l2.5 2.5L16 12" />
                </svg>
              </span>
              <span class="item-copy">
                <strong>每日学习计划</strong>
                <small>新词上限、目标记忆率与时区</small>
              </span>
              <svg class="item-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </router-link>
          </div>
          <p class="group-note">悬浮窗设置会立即生效，并保存在此浏览器中。</p>
        </section>

        <section class="settings-group" aria-labelledby="account-title">
          <div class="group-heading">
            <div>
              <p class="group-kicker">ACCOUNT & SUPPORT</p>
              <h2 id="account-title">账户与支持</h2>
            </div>
            <p>管理资料，或向我们反馈问题</p>
          </div>

          <div class="settings-list">
            <router-link class="setting-item setting-link" to="/user/profile">
              <span class="item-icon icon-profile" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5.5 19.5v-1.25a6.5 6.5 0 0 1 13 0v1.25H5.5Z" />
                </svg>
              </span>
              <span class="item-copy">
                <strong>个人资料</strong>
                <small>头像、用户名与个人简介</small>
              </span>
              <svg class="item-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </router-link>

            <router-link class="setting-item setting-link" :to="{ path: '/feedback', query: { from: '/settings' } }">
              <span class="item-icon icon-feedback" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 3v-3.5A2.5 2.5 0 0 1 3 15V7.5A2.5 2.5 0 0 1 5.5 5Z" />
                  <path d="M7.5 10h9M7.5 13.5h6" />
                </svg>
              </span>
              <span class="item-copy">
                <strong>意见反馈</strong>
                <small>反馈问题、分享想法与查看进度</small>
              </span>
              <svg class="item-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </router-link>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.settings-shell { max-width: 850px; }
.settings-shell :deep(.page-heading) { margin-bottom: 40px; }
.settings-content { display: grid; gap: 36px; }
.group-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.group-kicker { margin-bottom: 6px; color: var(--xl-brand); font-size: 10px; font-weight: 800; letter-spacing: .16em; }
.group-heading h2 { font: 650 23px/1.25 var(--xl-font-display); }
.group-heading > p { margin-bottom: 3px; color: var(--xl-ink-soft); font-size: 12px; }
.settings-list { overflow: hidden; border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); background: var(--xl-surface); box-shadow: 0 8px 24px rgba(36, 59, 45, .035); }
.setting-item { display: flex; align-items: center; gap: 17px; min-height: 90px; padding: 18px 24px; }
.setting-item + .setting-item { border-top: 1px solid var(--xl-border); }
.item-icon { display: grid; flex: none; place-items: center; width: 43px; height: 43px; border-radius: 12px; color: var(--xl-brand); background: #eaf0e7; }
.item-icon svg { width: 23px; height: 23px; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.icon-plan { color: #8a662d; background: #f6eedc; }
.icon-profile { color: #496c62; background: #e8f0ed; }
.icon-feedback { color: #825f53; background: #f4ece7; }
.item-copy { display: grid; flex: 1; gap: 5px; min-width: 0; }
.item-copy h3, .item-copy strong { margin: 0; color: var(--xl-ink); font-size: 15px; font-weight: 750; line-height: 1.4; }
.item-copy p, .item-copy small { margin: 0; color: var(--xl-ink-soft); font-size: 12px; line-height: 1.5; }
.setting-switch { flex: none; margin-left: 8px; }
.setting-switch:focus-within { outline: 3px solid var(--xl-accent); outline-offset: 3px; border-radius: 16px; }
.setting-link { color: inherit; text-decoration: none; transition: background-color .18s ease; }
.setting-link:hover { background: #f4f7f1; }
.setting-link:focus-visible { position: relative; z-index: 1; outline: 3px solid var(--xl-accent); outline-offset: -3px; }
.item-chevron { flex: none; width: 18px; height: 18px; margin-left: 8px; color: #79907e; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: transform .18s ease; }
.setting-link:hover .item-chevron { transform: translateX(3px); }
.group-note { margin: 10px 3px 0; color: var(--xl-ink-soft); font-size: 11px; line-height: 1.5; }
@media (max-width: 760px) {
  .settings-shell :deep(.page-heading) { margin-bottom: 30px; }
  .settings-content { gap: 30px; }
  .group-heading { margin-bottom: 12px; }
  .group-heading h2 { font-size: 21px; }
  .group-heading > p { display: none; }
  .setting-item { min-height: 78px; padding: 15px 18px; gap: 13px; }
}
@media (max-width: 480px) {
  .settings-shell { width: min(100% - 28px, var(--xl-content-width)); }
  .settings-shell :deep(.page-heading) { margin-bottom: 26px; }
  .settings-content { gap: 28px; }
  .settings-list { border-radius: 12px; }
  .setting-item { min-height: 76px; padding: 14px; gap: 12px; }
  .item-icon { width: 40px; height: 40px; border-radius: 11px; }
  .item-icon svg { width: 22px; height: 22px; }
  .item-copy h3, .item-copy strong { font-size: 14px; }
  .item-copy p, .item-copy small { font-size: 11px; }
  .setting-switch, .item-chevron { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .setting-link, .item-chevron { transition: none; }
}
</style>
