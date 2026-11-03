// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useTokenStore } from '@/stores/token'
import request from './request'

vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('element-plus', () => ({ ElMessage: { warning: vi.fn() } }))

describe('token refresh retry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('refreshes concurrent requests once and rejects repeat 401s', async () => {
    const attempts = new Map<string, number>()
    request.defaults.adapter = async config => {
      const path = config.url || ''
      attempts.set(path, (attempts.get(path) || 0) + 1)
      if (path === '/auth/refreshToken') {
        await Promise.resolve()
        return { config, data: { code: 0, data: 'fresh' }, status: 200, statusText: 'OK', headers: {} } as AxiosResponse
      }
      const response = { config, data: {}, status: 401, statusText: 'Unauthorized', headers: {} } as AxiosResponse
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
    }
    const results = await Promise.allSettled([request.get('/first'), request.get('/second')])
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected'])
    expect(attempts.get('/auth/refreshToken')).toBe(1)
    expect(attempts.get('/first')).toBe(2)
    expect(attempts.get('/second')).toBe(2)
    expect(useTokenStore().accessToken).toBe('')
  })
})
