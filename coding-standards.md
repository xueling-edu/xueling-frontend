# 学灵前端项目代码规范

## 目录
1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [命名规范](#命名规范)
5. [代码风格](#代码风格)
6. [TypeScript 规范](#typescript-规范)
7. [Vue 组件规范](#vue-组件规范)
8. [API 接口规范](#api-接口规范)
9. [状态管理规范](#状态管理规范)
10. [路由规范](#路由规范)
11. [样式规范](#样式规范)
12. [注释规范](#注释规范)
13. [错误处理规范](#错误处理规范)
14. [Git 提交规范](#git-提交规范)
15. [性能优化规范](#性能优化规范)

---

## 项目概述

本项目是"学灵"智能学习网站的前端应用，采用 Vue 3 + TypeScript 技术栈，提供英语学习、词汇记忆、文章阅读等功能。

### 核心特性
- 响应式设计，支持多端适配
- 组件化开发，提高代码复用性
- TypeScript 类型安全，减少运行时错误
- Pinia 状态管理，统一管理应用状态
- 路由守卫，保护需要认证的页面
- Token 自动刷新机制，提升用户体验

---

## 技术栈

### 核心框架
- **Vue 3.5.26** - 渐进式 JavaScript 框架
- **TypeScript 5.9.3** - JavaScript 的超集，提供类型安全
- **Vite 7.3.0** - 下一代前端构建工具

### 状态管理
- **Pinia 3.0.4** - Vue 官方推荐的状态管理库

### 路由
- **Vue Router 4.6.4** - Vue 官方路由管理器

### UI 组件库
- **Element Plus 2.13.1** - 基于 Vue 3 的组件库
- **Vue3Lottie 3.3.1** - Lottie 动画组件
- **Lottie Web 5.13.0** - Lottie 动画解析库

### HTTP 请求
- **Axios 1.13.2** - HTTP 客户端

### 测试
- **Vitest 4.0.17** - 单元测试框架
- **Vue Test Utils 2.4.6** - Vue 组件测试工具
- **jsdom 27.4.0** - DOM 环境模拟
- **fast-check 4.5.3** - 属性测试框架

### 开发工具
- **Vue DevTools 8.0.5** - Vue 调试工具
- **npm-run-all2 8.0.4** - 并行/串行运行 npm 脚本

### Node 版本要求
- Node.js: ^20.19.0 || >=22.12.0

---

## 项目结构

```
xueling-frontend/
├── public/                    # 静态资源
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── api/                   # API 接口层
│   │   ├── auth.ts           # 认证相关接口
│   │   ├── translate.ts      # 翻译相关接口
│   │   └── wordbook.ts       # 单词本相关接口
│   ├── components/            # 公共组件
│   │   ├── AIAssistant.vue   # AI 助手组件
│   │   ├── Icon.ts           # 图标组件
│   │   ├── InteractiveBackground.vue  # 交互背景组件
│   │   ├── TranslateDrawer.vue       # 翻译抽屉组件
│   │   └── WordFamilyTree.vue        # 单词家族树组件
│   ├── composables/           # 组合式函数
│   │   └── useTranslate.ts   # 翻译功能 composable
│   ├── router/               # 路由配置
│   │   └── index.ts
│   ├── stores/               # Pinia 状态管理
│   │   ├── counter.ts        # 计数器 store
│   │   ├── review.ts         # 复习 store
│   │   ├── token.ts          # Token store
│   │   └── user.ts           # 用户 store
│   ├── types/                # TypeScript 类型定义
│   │   ├── auth.ts           # 认证相关类型
│   │   ├── axios.d.ts        # Axios 类型扩展
│   │   ├── translate.ts      # 翻译相关类型
│   │   └── wordbook.ts       # 单词本相关类型
│   ├── utils/                # 工具函数
│   │   ├── crypto.ts         # 加密工具
│   │   ├── request.ts        # HTTP 请求封装
│   │   └── validators.ts     # 验证工具
│   ├── view/                 # 页面视图
│   │   ├── auth/             # 认证页面
│   │   │   ├── LoginView.vue
│   │   │   └── RegisterView.vue
│   │   ├── english/          # 英语学习页面
│   │   │   ├── article/     # 文章阅读
│   │   │   ├── vocab/        # 词汇学习
│   │   │   └── EnglishDashboard.vue
│   │   ├── user/             # 用户页面
│   │   │   └── ProfileView.vue
│   │   └── HomeView.vue
│   ├── App.vue               # 根组件
│   └── main.ts               # 应用入口
├── .gitignore
├── coding-standards          # 本代码规范文档
├── env.d.ts                  # 环境变量类型定义
├── index.html                # HTML 入口
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── tsconfig.app.json         # 应用 TypeScript 配置
├── tsconfig.node.json        # Node TypeScript 配置
├── vite.config.ts            # Vite 配置
└── vitest.config.ts          # Vitest 配置
```

### 目录职责说明

#### `src/api/` - API 接口层
- 负责所有后端 API 接口的调用
- 每个模块对应一个 API 文件
- 使用统一的 request 实例进行 HTTP 请求

#### `src/components/` - 公共组件
- 可复用的 Vue 组件
- 组件命名使用 PascalCase
- 组件应具有良好的 props 定义和 emits 声明

#### `src/composables/` - 组合式函数
- 可复用的逻辑函数
- 使用 Composition API 封装
- 返回响应式数据和方法

#### `src/router/` - 路由配置
- 定义应用路由
- 配置路由守卫
- 实现路由懒加载

#### `src/stores/` - 状态管理
- Pinia store 定义
- 管理应用全局状态
- 实现状态持久化

#### `src/types/` - 类型定义
- TypeScript 接口和类型定义
- 按模块分类组织
- 导出供其他模块使用

#### `src/utils/` - 工具函数
- 通用工具函数
- 验证函数
- 加密解密函数等

#### `src/view/` - 页面视图
- 应用页面组件
- 按功能模块分组
- 使用路由懒加载

---

## 命名规范

### 文件命名

#### Vue 组件文件
- 使用 **PascalCase** 命名
- 示例: `LoginView.vue`, `AIAssistant.vue`, `TranslateDrawer.vue`

#### TypeScript 文件
- 使用 **camelCase** 命名
- 示例: `auth.ts`, `request.ts`, `validators.ts`

#### 类型定义文件
- 使用 **camelCase** 命名，通常以模块名结尾
- 示例: `auth.ts`, `translate.ts`, `wordbook.ts`

### 变量命名

#### 常量
- 使用 **UPPER_SNAKE_CASE** 命名
- 示例:
```typescript
const MAX_HISTORY = 50
const HISTORY_KEY = 'translate_history'
const API_BASE_URL = '/api'
```

#### 变量
- 使用 **camelCase** 命名
- 示例:
```typescript
const userInfo = ref<UserInfo | null>(null)
const isLoggedIn = computed(() => userInfo.value !== null)
const loading = ref(false)
```

#### 函数
- 使用 **camelCase** 命名，动词开头
- 示例:
```typescript
const handleLogin = async () => {}
const validateEmail = (email: string): boolean => {}
const fetchUserInfo = async () => {}
```

#### 类/接口/类型
- 使用 **PascalCase** 命名
- 示例:
```typescript
interface UserInfo {}
interface LoginDTO {}
class UserService {}
type PasswordStrength = 'weak' | 'medium' | 'strong'
```

#### 布尔值
- 使用 **is/has/can/should** 前缀
- 示例:
```typescript
const isLoggedIn = ref(false)
const isLoading = ref(false)
const hasToken = computed(() => tokenStore.accessToken !== '')
const canEdit = ref(true)
```

### 组件命名

#### 组件注册名
- 使用 **PascalCase** 命名
- 示例:
```vue
<AIAssistant />
<TranslateDrawer />
<WordFamilyTree />
```

#### 组件内部变量
- 使用 **camelCase** 命名
- 示例:
```vue
<script setup lang="ts">
const loginForm = reactive({ email: '', password: '' })
const loginFormRef = ref<FormInstance>()
const loading = ref(false)
</script>
```

### CSS 类命名

#### BEM 命名规范
- 使用 **kebab-case** 命名
- 格式: `block__element--modifier`
- 示例:
```css
.login-container {}
.login-card {}
.login-form {}
.login-button {}
.login-button--loading {}
```

#### 工具类
- 使用简短的前缀
- 示例:
```css
.mt-4 { margin-top: 24px; }
.text-center { text-align: center; }
```

---

## 代码风格

### 缩进与空格
- 使用 **2 个空格** 缩进
- 不使用 Tab
- 运算符前后添加空格
- 逗号后添加空格
- 示例:
```typescript
const sum = a + b
const arr = [1, 2, 3]
const obj = { name: 'John', age: 30 }
```

### 分号
- **不使用** 分号（除非必要）
- 示例:
```typescript
const name = 'John'
const age = 30
console.log(name)
```

### 引号
- 字符串使用 **单引号**
- 模板字符串使用 **反引号**
- 示例:
```typescript
const message = 'Hello'
const greeting = `Hello, ${name}`
```

### 行宽
- 单行代码不超过 **100 字符**
- 超出时进行换行
- 示例:
```typescript
const longString = 'This is a very long string that exceeds the maximum line length'

const longFunctionCall = someFunction(
  arg1,
  arg2,
  arg3
)
```

### 空行
- 函数之间保留 **1 个空行**
- 逻辑块之间保留 **1 个空行**
- 示例:
```typescript
const validateEmail = (email: string): boolean => {
  return emailRegex.test(email.trim())
}

const validatePassword = (password: string): boolean => {
  return password.length >= 8
}
```

### 对象和数组
- 对象属性换行时，最后一个属性后保留逗号
- 数组元素换行时，最后一个元素后保留逗号
- 示例:
```typescript
const user = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
}

const numbers = [
  1,
  2,
  3,
]
```

---

## TypeScript 规范

### 类型定义

#### 接口定义
- 使用 **interface** 定义对象类型
- 使用 **type** 定义联合类型、交叉类型等
- 示例:
```typescript
interface UserInfo {
  id: string
  email: string
  username?: string
  avatar?: string
}

type PasswordStrength = 'weak' | 'medium' | 'strong'
```

#### 类型导出
- 类型定义应导出供其他模块使用
- 示例:
```typescript
export interface UserInfo {}
export type PasswordStrength = 'weak' | 'medium' | 'strong'
```

#### 泛型
- 使用有意义的泛型名称
- 示例:
```typescript
interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

const fetchData = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  return response.json()
}
```

### 类型使用

#### 避免使用 any
- 优先使用具体类型
- 必要时使用 **unknown** 代替 any
- 示例:
```typescript
// 不推荐
const data: any = response.data

// 推荐
const data: UserInfo = response.data

// 必要时使用 unknown
const data: unknown = response.data
if (isUserInfo(data)) {
  // 使用 data
}
```

#### 可选属性
- 使用 **?** 标记可选属性
- 示例:
```typescript
interface UserInfo {
  id: string
  email: string
  username?: string
  avatar?: string
}
```

#### 只读属性
- 使用 **readonly** 标记只读属性
- 示例:
```typescript
interface Config {
  readonly apiUrl: string
  readonly maxRetries: number
}
```

### 类型断言
- 优先使用 **as** 进行类型断言
- 避免使用 **<Type>** 语法
- 示例:
```typescript
// 推荐
const element = document.getElementById('app') as HTMLElement

// 不推荐
const element = <HTMLElement>document.getElementById('app')
```

### 类型守卫
- 使用类型守卫进行运行时类型检查
- 示例:
```typescript
function isUserInfo(data: unknown): data is UserInfo {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  )
}
```

### 枚举 vs 常量对象
- 优先使用 **常量对象** 代替枚举
- 示例:
```typescript
// 推荐
const Gender = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
} as const

type Gender = typeof Gender[keyof typeof Gender]

// 不推荐
enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
}
```

---

## Vue 组件规范

### 组件定义

#### 使用 Composition API
- 所有组件使用 **`<script setup>`** 语法
- 示例:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)
</script>
```

#### 组件命名
- 组件名使用 **PascalCase**
- 文件名与组件名保持一致
- 示例:
```vue
<!-- AIAssistant.vue -->
<script setup lang="ts">
// 组件代码
</script>
```

### Props 定义

#### 使用 TypeScript 定义 Props
- 使用 **defineProps** 和 **interface** 定义 Props
- 示例:
```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  disabled: false,
})
</script>
```

#### Props 验证
- 使用 TypeScript 类型进行验证
- 复杂验证使用自定义验证函数
- 示例:
```vue
<script setup lang="ts">
interface Props {
  email: string
  age: number
}

const props = defineProps<Props>()

// 自定义验证
if (!validateEmail(props.email)) {
  throw new Error('Invalid email')
}
</script>
```

### Emits 定义

#### 使用 TypeScript 定义 Emits
- 使用 **defineEmits** 和类型定义
- 示例:
```vue
<script setup lang="ts">
interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'submit', data: FormData): void
}

const emit = defineEmits<Emits>()
</script>
```

#### 触发事件
- 使用 camelCase 命名事件
- 示例:
```vue
<script setup lang="ts">
const emit = defineEmits<{
  updateModelValue: [value: string]
  submit: [data: FormData]
}>()

const handleSubmit = () => {
  emit('submit', formData)
}
</script>
```

### 组件生命周期

#### 使用 Composition API 生命周期
- 示例:
```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('Component mounted')
})

onUnmounted(() => {
  console.log('Component unmounted')
})
</script>
```

#### 避免使用 Options API 生命周期
- 不使用 `mounted`, `beforeUnmount` 等
- 统一使用 Composition API

### 模板规范

#### 使用语义化标签
- 示例:
```vue
<template>
  <div class="login-container">
    <header class="login-header">
      <h1>登录</h1>
    </header>
    <main class="login-main">
      <form @submit.prevent="handleSubmit">
        <!-- 表单内容 -->
      </form>
    </main>
    <footer class="login-footer">
      <p>&copy; 2026</p>
    </footer>
  </div>
</template>
```

#### 属性顺序
- 按照以下顺序排列属性:
  1. `v-if` / `v-else-if` / `v-else`
  2. `v-for`
  3. `v-show`
  4. `v-model`
  5. 其他指令
  6. `@` 事件监听
  7. `:` 绑定
  8. `ref` / `slot`
- 示例:
```vue
<template>
  <div
    v-if="isVisible"
    v-for="item in items"
    :key="item.id"
    class="item"
    @click="handleClick(item)"
  >
    {{ item.name }}
  </div>
</template>
```

#### 避免复杂表达式
- 复杂逻辑移到计算属性或方法中
- 示例:
```vue
<template>
  <!-- 不推荐 -->
  <div>{{ items.filter(item => item.active).length }}</div>

  <!-- 推荐 -->
  <div>{{ activeItemCount }}</div>
</template>

<script setup lang="ts">
const activeItemCount = computed(() => {
  return items.filter(item => item.active).length
})
</script>
```

### 组件通信

#### Props Down, Events Up
- 父组件通过 Props 传递数据
- 子组件通过 Events 通知父组件
- 示例:
```vue
<!-- 父组件 -->
<template>
  <ChildComponent
    :value="parentValue"
    @update:value="parentValue = $event"
  />
</template>

<!-- 子组件 -->
<script setup lang="ts">
const props = defineProps<{ value: string }>()
const emit = defineEmits<{ 'update:value': [value: string] }>()
</script>
```

#### 使用 v-model
- 双向绑定使用 `v-model`
- 示例:
```vue
<!-- 父组件 -->
<template>
  <ChildComponent v-model="value" />
</template>

<!-- 子组件 -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const updateValue = (newValue: string) => {
  emit('update:modelValue', newValue)
}
</script>
```

#### Provide / Inject
- 跨层级通信使用 Provide / Inject
- 示例:
```vue
<!-- 祖先组件 -->
<script setup lang="ts">
import { provide } from 'vue'

provide('theme', 'dark')
</script>

<!-- 后代组件 -->
<script setup lang="ts">
import { inject } from 'vue'

const theme = inject<string>('theme', 'light')
</script>
```

---

## API 接口规范

### API 文件组织

#### 按模块划分
- 每个业务模块对应一个 API 文件
- 示例:
```typescript
// src/api/auth.ts
export const login = (data: LoginDTO): Promise<AuthResponse> => {}
export const register = (data: RegisterDTO): Promise<AuthResponse> => {}
export const logout = (): Promise<ApiResponse> => {}

// src/api/wordbook.ts
export const getWordbooks = (): Promise<ApiResponse<Wordbook[]>> => {}
export const createWordbook = (data: CreateWordbookDTO): Promise<ApiResponse<Wordbook>> => {}
```

### 请求封装

#### 使用统一的 request 实例
- 示例:
```typescript
import request from '@/utils/request'

export const getUserInfo = (): Promise<ApiResponse<UserVO>> => {
  return request.get('/users/info')
}
```

#### 请求方法
- 使用语义化的 HTTP 方法
- 示例:
```typescript
// GET - 获取资源
export const getUserInfo = (id: string): Promise<ApiResponse<UserVO>> => {
  return request.get(`/users/${id}`)
}

// POST - 创建资源
export const createUser = (data: CreateUserDTO): Promise<ApiResponse<UserVO>> => {
  return request.post('/users', data)
}

// PUT - 更新资源
export const updateUser = (id: string, data: UpdateUserDTO): Promise<ApiResponse<UserVO>> => {
  return request.put(`/users/${id}`, data)
}

// DELETE - 删除资源
export const deleteUser = (id: string): Promise<ApiResponse<void>> => {
  return request.delete(`/users/${id}`)
}
```

### 请求参数

#### 路径参数
- 示例:
```typescript
export const getUserById = (id: string): Promise<ApiResponse<UserVO>> => {
  return request.get(`/users/${id}`)
}
```

#### 查询参数
- 示例:
```typescript
export const getUsers = (params: QueryParams): Promise<ApiResponse<UserVO[]>> => {
  return request.get('/users', { params })
}
```

#### 请求体
- 示例:
```typescript
export const createUser = (data: CreateUserDTO): Promise<ApiResponse<UserVO>> => {
  return request.post('/users', data)
}
```

### 响应处理

#### 统一响应格式
- 示例:
```typescript
interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}
```

#### 错误处理
- 在调用处处理错误
- 示例:
```typescript
try {
  const response = await login(loginData)
  if (response.code === 0) {
    // 处理成功
  } else {
    // 处理业务错误
    ElMessage.error(response.msg)
  }
} catch (error) {
  // 处理网络错误
  ElMessage.error('网络错误，请稍后重试')
}
```

### 类型定义

#### DTO (Data Transfer Object)
- 请求参数类型
- 示例:
```typescript
export interface LoginDTO {
  email: string
  password: string
  ip?: string
}

export interface RegisterDTO {
  email: string
  password: string
  confirmPassword: string
  verificationCode: string
}
```

#### VO (View Object)
- 响应数据类型
- 示例:
```typescript
export interface UserVO {
  id: number
  username: string
  email: string
  avatarUrl?: string
}
```

### API 文档注释

#### 使用 JSDoc 注释
- 示例:
```typescript
/**
 * 用户登录
 * @param loginData 登录数据（邮箱、密码、IP）
 * @returns Promise<AuthResponse> 返回 AccessToken
 * 
 * 需求: 8.2 - 调用登录 API 发送包含 email、password、ip 的请求
 */
export const login = (loginData: LoginDTO): Promise<AuthResponse> => {
  return request.post('/auth/login', loginData)
}
```

---

## 状态管理规范

### Store 定义

#### 使用 Pinia
- 示例:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // state
  const userInfo = ref<UserInfo | null>(null)

  // getters
  const isLoggedIn = computed(() => userInfo.value !== null)

  // actions
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  return {
    userInfo,
    isLoggedIn,
    setUserInfo,
  }
})
```

### State 管理

#### 使用 ref 定义状态
- 示例:
```typescript
const userInfo = ref<UserInfo | null>(null)
const loading = ref(false)
const error = ref<string>('')
```

#### 状态持久化
- 登录资料以服务端为准，页面内使用 Pinia 状态；不要将访问令牌或用户资料写入 localStorage
- 设备偏好可按用户 ID 存入 localStorage；仅需同标签页刷新恢复的临时步骤可存入 sessionStorage
- 示例:
```typescript
const setUserInfo = (info: UserInfo) => {
  userInfo.value = info
}

const clearUserInfo = () => {
  userInfo.value = null
}
```

### Getters

#### 使用 computed 定义计算属性
- 示例:
```typescript
const isLoggedIn = computed(() => userInfo.value !== null)
const username = computed(() => userInfo.value?.username || '')
const avatar = computed(() => userInfo.value?.avatar || '')
```

### Actions

#### 异步操作
- 使用 async/await
- 示例:
```typescript
const fetchUserInfo = async () => {
  try {
    loading.value = true
    const response = await getUserInfo()
    if (response.code === 0 && response.data) {
      setUserInfo(response.data)
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  } finally {
    loading.value = false
  }
}
```

#### 错误处理
- 在 action 中处理错误
- 示例:
```typescript
const logout = async () => {
  try {
    await logoutApi()
  } catch (error) {
    console.error('登出失败:', error)
  } finally {
    clearUserInfo()
  }
}
```

### Store 命名

#### 使用 use 前缀
- 示例:
```typescript
export const useUserStore = defineStore('user', () => {})
export const useTokenStore = defineStore('token', () => {})
export const useReviewStore = defineStore('review', () => {})
```

---

## 路由规范

### 路由定义

#### 使用 createWebHistory
- 示例:
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})
```

### 路由配置

#### 路由懒加载
- 使用动态导入
- 示例:
```typescript
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/view/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/english',
    name: 'english',
    component: () => import('@/view/english/EnglishDashboard.vue'),
    meta: { requiresAuth: true }
  },
]
```

#### 路由元信息
- 使用 meta 定义路由元信息
- 示例:
```typescript
{
  path: '/login',
  name: 'login',
  component: LoginView,
  meta: { requiresAuth: false }
}
```

### 路由守卫

#### 全局前置守卫
- 示例:
```typescript
router.beforeEach(async (to, _from, next) => {
  const tokenStore = useTokenStore()
  const userStore = useUserStore()
  
  const hasToken = tokenStore.accessToken && tokenStore.accessToken.trim() !== ''

  if (to.meta.requiresAuth && !hasToken) {
    next({ name: 'login' })
    return
  }

  if (hasToken && !userStore.userInfo && to.meta.requiresAuth) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      tokenStore.removeToken()
      userStore.clearUserInfo()
      next({ name: 'login' })
      return
    }
  }

  next()
})
```

#### 路由参数验证
- 示例:
```typescript
{
  path: '/english/vocab/book/:id',
  name: 'english-vocab-book',
  component: () => import('@/view/english/vocab/BookDetail.vue'),
  meta: { requiresAuth: true }
}
```

### 路由跳转

#### 使用编程式导航
- 示例:
```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// 跳转到指定路由
router.push('/login')

// 带参数跳转
router.push({ name: 'english-vocab-book', params: { id: '123' } })

// 替换当前路由
router.replace('/login')

// 返回上一页
router.back()
```

---

## 样式规范

### CSS 组织

#### 使用 Scoped 样式
- 示例:
```vue
<style scoped>
.login-container {
  /* 样式 */
}
</style>
```

#### 全局样式
- 在 `App.vue` 中定义全局样式
- 示例:
```vue
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
```

### CSS 命名

#### 使用 kebab-case
- 示例:
```css
.login-container {}
.login-card {}
.login-button {}
```

#### BEM 命名规范
- 示例:
```css
.login-card {}
.login-card__header {}
.login-card__body {}
.login-card__footer {}
.login-card--loading {}
```

### 样式优先级

#### 避免使用 !important
- 除非绝对必要
- 示例:
```css
/* 不推荐 */
.button {
  color: red !important;
}

/* 推荐 */
.button.primary {
  color: red;
}
```

#### 使用 CSS 变量
- 示例:
```css
:root {
  --primary-color: #4facfe;
  --secondary-color: #00f2fe;
  --text-color: #333;
  --border-radius: 8px;
}

.button {
  background-color: var(--primary-color);
  border-radius: var(--border-radius);
}
```

### 响应式设计

#### 使用媒体查询
- 示例:
```css
@media (max-width: 768px) {
  .login-card {
    padding: 20px;
  }
}
```

#### 移动端优先
- 优先编写移动端样式
- 使用媒体查询适配桌面端
- 示例:
```css
/* 移动端样式 */
.login-card {
  padding: 16px;
}

/* 桌面端样式 */
@media (min-width: 768px) {
  .login-card {
    padding: 40px;
  }
}
```

### 动画

#### 使用 CSS 过渡
- 示例:
```css
.button {
  transition: all 0.3s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
```

#### 使用 CSS 动画
- 示例:
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease;
}
```

---

## 注释规范

### 文件注释

#### 使用 JSDoc 注释
- 示例:
```typescript
/**
 * 认证 API 服务层
 * 提供登录、注册、验证码发送等认证相关的 API 接口
 */

import request from '@/utils/request'
```

### 函数注释

#### 使用 JSDoc 注释
- 示例:
```typescript
/**
 * 用户登录
 * @param loginData 登录数据（邮箱、密码、IP）
 * @returns Promise<AuthResponse> 返回 AccessToken
 * 
 * 需求: 8.2 - 调用登录 API 发送包含 email、password、ip 的请求
 */
export const login = (loginData: LoginDTO): Promise<AuthResponse> => {
  return request.post('/auth/login', loginData)
}
```

### 类型注释

#### 接口注释
- 示例:
```typescript
/**
 * 用户信息
 */
export interface UserInfo {
  id: string
  email: string
  username?: string
  avatar?: string
}
```

#### 属性注释
- 示例:
```typescript
export interface UserVO {
  id: number              // 用户ID
  username: string        // 用户名
  email: string           // 邮箱
  phone?: string          // 手机号
  avatarUrl?: string      // 头像URL
}
```

### 代码注释

#### 单行注释
- 示例:
```typescript
// 登录后从服务端恢复用户信息
await userStore.fetchUserInfo()
```

#### 多行注释
- 示例:
```typescript
/*
 * 计算属性：判断用户是否已登录
 * 根据 userInfo 是否为 null 来判断
 */
const isLoggedIn = computed(() => userInfo.value !== null)
```

#### TODO 注释
- 示例:
```typescript
// TODO: 实现微信登录功能
const handleWechatLogin = () => {
  ElMessage.info('微信登录功能开发中...')
}
```

#### FIXME 注释
- 示例:
```typescript
// FIXME: 修复刷新 Token 时的并发问题
const refreshToken = async () => {
  // 代码
}
```

### Vue 组件注释

#### 组件注释
- 示例:
```vue
<!--
  AI 助手组件
  提供智能问答功能
-->
<template>
  <!-- 模板 -->
</template>
```

#### 模板注释
- 示例:
```vue
<template>
  <!-- 聊天窗口 -->
  <div v-if="isOpen" class="chat-window">
    <!-- 内容 -->
  </div>
</template>
```

---

## 错误处理规范

### 错误捕获

#### 使用 try-catch
- 示例:
```typescript
try {
  const response = await login(loginData)
  // 处理响应
} catch (error) {
  console.error('登录失败:', error)
  // 处理错误
}
```

#### 异步错误处理
- 示例:
```typescript
const fetchUserInfo = async () => {
  try {
    const response = await getUserInfo()
    return response.data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}
```

### 错误提示

#### 使用 Element Plus 消息提示
- 示例:
```typescript
import { ElMessage } from 'element-plus'

try {
  const response = await login(loginData)
  ElMessage.success('登录成功')
} catch (error) {
  ElMessage.error('登录失败，请重试')
}
```

#### 错误信息国际化
- 示例:
```typescript
const errorMessages = {
  'INVALID_EMAIL': '邮箱格式不正确',
  'INVALID_PASSWORD': '密码格式不正确',
  'USER_NOT_FOUND': '用户不存在',
  'WRONG_PASSWORD': '密码错误',
}

const getErrorMessage = (code: string): string => {
  return errorMessages[code] || '操作失败，请稍后重试'
}
```

### 全局错误处理

#### 全局错误处理器
- 示例:
```typescript
app.config.errorHandler = (err, _instance, info) => {
  console.error('Global error:', err)
  console.error('Error info:', info)
  // 发送到错误监控服务
}
```

#### HTTP 错误拦截
- 示例:
```typescript
instance.interceptors.response.use(
  result => result.data,
  error => {
    if (error.response?.status === 401) {
      // 处理未授权
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
```

---

## Git 提交规范

### 提交信息格式

#### 使用 Conventional Commits
- 格式: `<type>(<scope>): <subject>`
- 示例:
```
feat(auth): 添加登录功能
fix(api): 修复 Token 刷新问题
docs(readme): 更新项目文档
style(login): 优化登录页面样式
refactor(user): 重构用户信息获取逻辑
test(utils): 添加验证工具测试
chore(deps): 更新依赖版本
```

### 提交类型

#### feat - 新功能
- 示例:
```
feat(auth): 添加微信登录功能
feat(wordbook): 添加单词本创建功能
```

#### fix - 修复 Bug
- 示例:
```
fix(api): 修复 Token 过期后未自动刷新的问题
fix(router): 修复路由守卫导致的死循环
```

#### docs - 文档更新
- 示例:
```
docs(readme): 更新项目说明文档
docs(api): 添加 API 接口文档
```

#### style - 代码格式调整
- 示例:
```
style(login): 优化登录页面样式
style(components): 统一组件样式规范
```

#### refactor - 重构代码
- 示例:
```
refactor(stores): 重构状态管理逻辑
refactor(utils): 优化工具函数
```

#### test - 测试相关
- 示例:
```
test(validators): 添加验证函数单元测试
test(api): 添加 API 接口测试
```

#### chore - 构建/工具相关
- 示例:
```
chore(deps): 更新 Vue 版本
chore(build): 优化构建配置
```

### 提交信息规范

#### Subject 规范
- 使用中文
- 不超过 50 个字符
- 不以句号结尾
- 示例:
```
feat(auth): 添加登录功能
```

#### Body 规范
- 详细描述提交内容
- 每行不超过 72 个字符
- 示例:
```
feat(auth): 添加登录功能

- 实现邮箱登录
- 实现手机号登录
- 添加表单验证
- 添加错误处理
```

---

## 性能优化规范

### 组件优化

#### 使用 v-show 替代 v-if（频繁切换）
- 示例:
```vue
<!-- 推荐 -->
<div v-show="isVisible">内容</div>

<!-- 不推荐（频繁切换时） -->
<div v-if="isVisible">内容</div>
```

#### 使用 v-once 静态内容
- 示例:
```vue
<div v-once>
  <h1>静态标题</h1>
</div>
```

#### 使用 key 优化列表渲染
- 示例:
```vue
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>
```

### 计算属性优化

#### 使用计算属性缓存
- 示例:
```vue
<script setup lang="ts">
// 推荐
const filteredItems = computed(() => {
  return items.value.filter(item => item.active)
})

// 不推荐
const filteredItems = items.value.filter(item => item.active)
</script>
```

### 路由优化

#### 路由懒加载
- 示例:
```typescript
const routes = [
  {
    path: '/login',
    component: () => import('@/view/auth/LoginView.vue')
  }
]
```

#### 预加载关键路由
- 示例:
```typescript
const preloadRoutes = () => {
  import('@/view/HomeView.vue')
  import('@/view/english/EnglishDashboard.vue')
}
```

### 资源优化

#### 图片懒加载
- 示例:
```vue
<img v-lazy="imageUrl" alt="图片" />
```

#### 使用 WebP 格式
- 示例:
```vue
<picture>
  <source :srcset="imageUrlWebp" type="image/webp" />
  <img :src="imageUrl" alt="图片" />
</picture>
```

### 代码分割

#### 动态导入
- 示例:
```typescript
const loadComponent = async () => {
  const component = await import('@/components/HeavyComponent.vue')
  return component.default
}
```

### 请求优化

#### 请求防抖
- 示例:
```typescript
import { debounce } from 'lodash-es'

const search = debounce(async (keyword: string) => {
  const results = await searchApi(keyword)
}, 300)
```

#### 请求节流
- 示例:
```typescript
import { throttle } from 'lodash-es'

const handleScroll = throttle(() => {
  // 处理滚动
}, 100)
```

---

## 附录

### 推荐阅读

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue Router 官方文档](https://router.vuejs.org/)
- [Element Plus 官方文档](https://element-plus.org/)

### 工具推荐

- **VS Code** - 推荐的代码编辑器
- **Vue DevTools** - Vue 调试工具
- **TypeScript Vue Plugin** - VS Code 插件

### 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 运行测试
npm run test

# 运行测试（监听模式）
npm run test:watch

# 运行测试（UI 模式）
npm run test:ui
```

### 版本历史

- v1.0.0 - 初始版本 (2026-02-02)

---

**注意**: 本代码规范文档会随着项目发展不断更新和完善，请定期查看最新版本。
