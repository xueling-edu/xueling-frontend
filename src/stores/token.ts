import { defineStore } from "pinia";
import { ref } from "vue";
import axios from 'axios'


export const useTokenStore = defineStore(
    'token',
    ()=>{
        // 清理旧版本持久化的令牌；新令牌只保存在当前页面内存中。
        try { localStorage.removeItem('access_token') } catch { /* Storage may be disabled. */ }
        const accessToken = ref('')
        let restored = false
        let restorePromise: Promise<boolean> | null = null

        const setToken = (newAccessToken:string)=>{
            accessToken.value = newAccessToken;
            restored = true
        }
        const removeToken = ()=>{
            accessToken.value = ''
            restored = true
            try { localStorage.removeItem('access_token') } catch { /* Memory token was still cleared. */ }
        }
        const restoreSession = (): Promise<boolean> => {
            if (accessToken.value) return Promise.resolve(true)
            if (restored) return Promise.resolve(false)
            if (!restorePromise) {
                restorePromise = axios.post<{ code: number; data: string }>(
                    '/api/auth/refreshToken', {}, { withCredentials: true }
                ).then(response => {
                    const token = response.data?.data
                    if (response.data?.code === 0 && token) {
                        setToken(token)
                        return true
                    }
                    return false
                }).catch(() => false).finally(() => {
                    restored = true
                    restorePromise = null
                })
            }
            return restorePromise
        }
        return {
            accessToken,setToken,removeToken,restoreSession
        }
    }
)
