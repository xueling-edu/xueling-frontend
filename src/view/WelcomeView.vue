<script setup lang="ts">
import { ref } from 'vue'

const previewStep = ref<'recall' | 'answer' | 'done'>('recall')

function resetPreview() {
  previewStep.value = 'recall'
}
</script>

<template>
  <div class="welcome-page">
    <header class="site-header">
      <div class="header-inner">
        <router-link class="brand" to="/welcome" aria-label="学灵介绍页">
          <img src="/logo.svg" alt="" />
          <span>学灵</span>
        </router-link>
        <nav class="header-nav" aria-label="主导航">
          <a href="#how-it-works">学习方式</a>
          <router-link class="login-link" to="/login">登录</router-link>
          <router-link class="header-cta" to="/register">创建账号 <span aria-hidden="true">→</span></router-link>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span></span> 单词记忆 · 英语阅读</p>
          <h1 id="hero-title">让新词，<br /><em>留在记忆里。</em></h1>
          <p class="hero-description">先试着回忆，再揭晓释义。学灵根据你的掌握情况安排复习，也让你在文章中继续遇见学过的表达。</p>
          <div class="hero-actions">
            <router-link class="primary-link" to="/register">免费创建账号 <span aria-hidden="true">→</span></router-link>
            <a class="secondary-link" href="#preview">先体验学习卡片 ↓</a>
          </div>
          <p class="hero-note">注册后选择一本词书，就能开始今天的学习。</p>
        </div>

        <div id="preview" class="preview-area">
          <div class="preview-caption"><span>01 / 学习卡片预览</span><span>无需登录</span></div>
          <div class="preview-card">
            <div class="card-top"><span>{{ previewStep === 'done' ? '本次体验完成' : '先回忆 · 再核对' }}</span><span class="card-spark" aria-hidden="true">✦</span></div>
            <p class="preview-word">curious</p>
            <template v-if="previewStep === 'recall'">
              <p class="preview-hint">看到英文后，先在心里想出它的意思。</p>
              <button class="preview-primary" type="button" @click="previewStep = 'answer'">查看答案</button>
            </template>
            <template v-else-if="previewStep === 'answer'">
              <p class="preview-meaning"><span>中文释义</span>好奇的；求知欲强的</p>
              <p class="preview-hint">揭晓前，你想起来了吗？</p>
              <div class="preview-rating">
                <button type="button" @click="previewStep = 'done'">没想起</button>
                <button type="button" @click="previewStep = 'done'">想起来了</button>
              </div>
            </template>
            <template v-else>
              <p class="preview-hint">正式学习时，学灵会根据你的评分安排下次复习。</p>
              <button class="preview-primary" type="button" @click="resetPreview">再体验一次</button>
            </template>
          </div>
          <p class="preview-footnote">这是交互预览，不会记录学习进度。</p>
        </div>
      </section>

      <section id="how-it-works" class="how-it-works" aria-labelledby="steps-title">
        <div class="section-intro"><p class="eyebrow">HOW IT WORKS / 学习路径</p><h2 id="steps-title">从第一本词书开始</h2></div>
        <div class="steps">
          <article><span class="step-number">01</span><h3>选择词书</h3><p>选一本适合自己的词书，加入每日学习计划。</p></article>
          <article><span class="step-number">02</span><h3>主动回忆</h3><p>先看英文，再核对答案，并按真实回忆情况评分。</p></article>
          <article><span class="step-number">03</span><h3>按时复习</h3><p>到期单词会重新出现；也可以通过英语文章积累表达。</p></article>
        </div>
      </section>

      <section class="closing" aria-label="开始学习">
        <div><p class="eyebrow">READY WHEN YOU ARE</p><h2>今天，从一个单词开始。</h2></div>
        <router-link class="primary-link" to="/register">创建账号，开始学习 <span aria-hidden="true">→</span></router-link>
      </section>
    </main>

    <footer class="site-footer"><span>学灵 · 让学习有迹可循</span><router-link to="/login">已有账号？登录</router-link></footer>
  </div>
</template>

<style scoped>
.welcome-page { min-height: 100vh; background: var(--xl-bg); color: var(--xl-ink); }
.site-header { background: var(--xl-surface); border-bottom: 1px solid var(--xl-border); }
.header-inner { width: min(100% - 48px, var(--xl-content-width)); min-height: 72px; margin: auto; display: flex; align-items: center; justify-content: space-between; gap: 22px; }
.brand { display: inline-flex; align-items: center; gap: 10px; color: var(--xl-ink); text-decoration: none; font: 700 23px var(--xl-font-display); }
.brand img { width: 36px; height: 36px; }
.header-nav { display: flex; align-items: center; gap: 28px; }
.header-nav a { color: var(--xl-ink); text-decoration: none; font-size: 13px; font-weight: 750; }
.header-nav a:hover { color: var(--xl-brand); }
.header-nav .header-cta { display: inline-flex; align-items: center; gap: 14px; min-height: 40px; padding: 0 14px; border-radius: var(--xl-button-radius); background: var(--xl-brand); color: white; }
.header-nav .header-cta:hover { background: var(--xl-brand-hover); color: white; }
.hero { width: min(100% - 48px, var(--xl-content-width)); min-height: 620px; margin: auto; padding: 88px 0 86px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 440px); align-items: center; gap: 64px; }
.eyebrow { color: #54715a; font-size: 11px; font-weight: 850; letter-spacing: .13em; }
.hero-copy .eyebrow { display: flex; align-items: center; gap: 9px; }
.hero-copy .eyebrow span { width: 24px; height: 2px; background: var(--xl-accent); }
.hero h1 { margin: 22px 0 24px; font: 700 clamp(48px, 5.4vw, 74px)/1.13 var(--xl-font-display); letter-spacing: -.05em; }
.hero h1 em { color: var(--xl-brand); font-weight: 650; font-style: normal; }
.hero-description { max-width: 520px; color: var(--xl-ink-soft); font-size: 16px; line-height: 1.85; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 22px; margin-top: 34px; }
.primary-link { display: inline-flex; align-items: center; justify-content: space-between; gap: 22px; min-height: 50px; padding: 0 21px; border: 1px solid #254c35; border-radius: var(--xl-button-radius); background: var(--xl-brand); color: white; box-shadow: var(--xl-button-shadow); font-size: 14px; font-weight: 800; text-decoration: none; transition: transform .18s, box-shadow .18s, background .18s; }
.primary-link:hover { transform: translateY(-2px); background: var(--xl-brand-hover); box-shadow: var(--xl-button-shadow-hover); }
.secondary-link { color: var(--xl-brand); font-size: 14px; font-weight: 750; text-decoration: none; }
.secondary-link:hover { text-decoration: underline; }
.hero-note { margin-top: 22px; color: #718273; font-size: 12px; }
.preview-area { position: relative; scroll-margin-top: 32px; }
.preview-area::before { content: ''; position: absolute; width: 240px; height: 240px; right: -32px; top: -40px; border: 1px solid #cbd9c6; border-radius: 50%; pointer-events: none; }
.preview-caption { position: relative; display: flex; justify-content: space-between; gap: 10px; margin-bottom: 14px; color: #58755e; font-size: 11px; font-weight: 800; letter-spacing: .06em; }
.preview-card { position: relative; min-height: 370px; display: flex; flex-direction: column; padding: 30px; border: 1px solid #bfd0bd; border-radius: 22px; background: var(--xl-surface); box-shadow: 0 20px 48px #29463114; }
.card-top { display: flex; justify-content: space-between; color: #5c785f; font-size: 12px; font-weight: 800; }
.card-spark { color: #c49443; font-size: 23px; line-height: 1; }
.preview-word { margin: 36px 0 12px; color: var(--xl-brand); font: italic 600 clamp(48px, 5vw, 64px)/1 var(--xl-font-display); letter-spacing: -.04em; }
.preview-hint { max-width: 330px; margin-bottom: 25px; color: var(--xl-ink-soft); font-size: 13px; line-height: 1.7; }
.preview-primary { width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding: 0 17px; border: 0; border-radius: var(--xl-button-radius); background: var(--xl-brand); color: white; cursor: pointer; font-weight: 800; }
.preview-primary:hover { background: var(--xl-brand-hover); }
.preview-meaning { display: grid; gap: 5px; margin: 0 0 14px; font-size: 21px; font-weight: 750; }
.preview-meaning span { color: #6c896e; font-size: 11px; font-weight: 800; }
.preview-rating { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; }
.preview-rating button { min-height: 48px; border: 1px solid #b9cdb9; border-radius: var(--xl-button-radius); background: #f2f7ef; color: var(--xl-brand); cursor: pointer; font-weight: 800; }
.preview-rating button:hover { background: #e5efe2; }
.preview-footnote { margin-top: 14px; color: #718273; font-size: 11px; text-align: right; }
.how-it-works { padding: 64px max(24px, calc((100% - var(--xl-content-width)) / 2)) 82px; border-block: 1px solid var(--xl-border); background: var(--xl-surface); scroll-margin-top: 16px; }
.section-intro h2 { margin-top: 12px; font: 700 clamp(30px, 3vw, 39px)/1.2 var(--xl-font-display); }
.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 30px; }
.steps article { min-height: 194px; padding: 24px; border: 1px solid var(--xl-border); border-radius: var(--xl-radius-md); background: #f7f9f4; }
.step-number { color: #a17637; font: 700 18px var(--xl-font-display); }
.steps h3 { margin-top: 28px; font: 700 22px var(--xl-font-display); }
.steps p { margin-top: 8px; color: var(--xl-ink-soft); font-size: 13px; line-height: 1.7; }
.closing { width: min(100% - 48px, var(--xl-content-width)); margin: auto; padding: 74px 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.closing h2 { margin-top: 10px; font: 700 clamp(27px, 3vw, 38px) var(--xl-font-display); }
.site-footer { width: min(100% - 48px, var(--xl-content-width)); margin: auto; padding: 24px 0 34px; display: flex; justify-content: space-between; gap: 18px; border-top: 1px solid var(--xl-border); color: var(--xl-ink-soft); font-size: 12px; }
.site-footer a { color: var(--xl-brand); font-weight: 750; text-decoration: none; }
@media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 52px; padding: 65px 0; }.preview-area { width: min(100%, 540px); }.steps { gap: 10px; } }
@media (max-width: 640px) { .header-inner, .hero, .closing, .site-footer { width: min(100% - 32px, var(--xl-content-width)); }.header-inner { min-height: 64px; }.header-nav { gap: 15px; }.header-nav a:first-child { display: none; }.header-nav .header-cta { min-height: 38px; padding-inline: 11px; }.hero { padding: 54px 0 62px; gap: 48px; }.hero h1 { font-size: clamp(45px, 12vw, 62px); }.hero-description { font-size: 14px; }.preview-area::before { right: -8px; }.preview-card { min-height: 340px; padding: 24px; }.how-it-works { padding: 56px 16px 64px; }.steps { grid-template-columns: 1fr; }.steps article { min-height: 0; }.steps h3 { margin-top: 14px; }.closing { align-items: stretch; flex-direction: column; padding: 60px 0; }.closing .primary-link { width: fit-content; }.site-footer { flex-direction: column; } }
@media (prefers-reduced-motion: reduce) { .primary-link { transition: none; }.primary-link:hover { transform: none; } }
</style>
