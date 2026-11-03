import { useTokenStore } from '@/stores/token'
import axios from 'axios'
import {ElMessage} from 'element-plus'
import router from '@/router'


const baseURL = '/api'
const instance = axios.create({
    baseURL,
    withCredentials: true,  // 支持HttpOnly Cookie
    headers: {
        'Content-Type': 'application/json'  // 设置默认 Content-Type 为 JSON
    },
    // 确保数据被正确序列化为 JSON
    transformRequest: [
        (data, headers) => {
            // 如果数据是对象，序列化为 JSON 字符串
            if (data && typeof data === 'object' && !(data instanceof FormData)) {
                headers['Content-Type'] = 'application/json'
                return JSON.stringify(data)
            }
            return data
        }
    ]
})
// 定义队列项的接口
interface PendingRequest {
    resolve: (value: unknown) => void
    reject: (reason?: any) => void
    config: any
}

let isRefreshing = false // 是否正在刷新Token
let requestsQueue: Array<PendingRequest> = []  // 等待刷新的请求队列


//添加请求拦截器
instance.interceptors.request.use(
    config => {
        const tokenStore = useTokenStore()
       
        const requestPath = config.url
        // 不需要认证的路径：登录、注册、发送验证码
        if (requestPath?.includes('/login') || 
            requestPath?.includes('/sendVerificationCode/') || 
            requestPath?.includes('/register')) {
           return config
        }
        
        // 跳过刷新Token请求的拦截器
        if (config.skipInterceptors) return config
        
        // 检查是否有访问令牌
        const token = tokenStore.accessToken?.trim()
        if (token) {
            // 添加 Authorization 头
            config.headers.Authorization = 'Bearer ' + token
            console.log('请求拦截器：已添加 Authorization 头', config.url)
        }
        return config
    },
    err => {
        return Promise.reject(err)
    }
)



//添加响应拦截器
instance.interceptors.response.use(
    result => {

        // 如果是 text 类型响应，直接返回（不处理code）
        if (result.config.responseType === 'text') {
        return result.data; 
        }
        // 若是直接返回 Blob 对象
        if (result.config.responseType === 'blob') {
            return result.data; 
        }

        if(result.data.code == 0){
            return result.data
        }else{
            // 不在拦截器中显示错误消息，让组件自己处理
            // 只是将错误信息传递出去
            return Promise.reject(result.data)
        }
    },
    async(err) => {
        const originalConfig = err.config
        const tokenStore = useTokenStore()
        // 刷新Token请求本身失败
        if (originalConfig?.skipInterceptors) {
            ElMessage.warning('登录过期，请重新登录！！！')
            tokenStore.removeToken()
            router.push('/login')
            return Promise.reject(err)
        }
    
        // 处理401错误（Token过期）
        if (err.response?.status === 401) {
        // A retried request must never start another refresh cycle.
        if (!originalConfig || originalConfig._retryAfterRefresh) {
            tokenStore.removeToken()
            router.push('/login')
            return Promise.reject(err)
        }
        originalConfig._retryAfterRefresh = true

        // 如果不在刷新中，发起刷新请求
        if (!isRefreshing) {
            isRefreshing = true
            try {
                // 调用刷新Token接口 (refreshToken通过HttpOnly Cookie自动发送)
                const refreshRes = await instance.post(
                    '/auth/refreshToken',
                    {},
                    { 
                        skipInterceptors: true,
                        withCredentials: true  // 确保发送Cookie
                    }
                )
                
                // 更新accessToken (refreshToken由后端通过Cookie管理)
                // 响应格式: { code: 0, msg: null, data: "token字符串" }
                tokenStore.setToken(refreshRes.data)
                
                // 重试队列中的所有请求
                const queued = requestsQueue.splice(0)
                queued.forEach(({ resolve, config }) => resolve(instance(config)))
                
                // 重试当前请求
                return instance(originalConfig)
            } catch (refreshErr) {
                // 刷新失败，清理队列并拒绝所有请求
                requestsQueue.splice(0).forEach(({ reject }) => reject(refreshErr))

                // 刷新失败，需要重新登录
                tokenStore.removeToken()
                router.push('/login')
                return Promise.reject(refreshErr)
            } finally {
                isRefreshing = false
            }
        } else {
            // 如果正在刷新中，将请求加入队列等待
            return new Promise((resolve, reject) => {
                requestsQueue.push({ 
                    resolve, 
                    reject, 
                    config: originalConfig 
                })
            })
        }
        }
        
        // 处理其他HTTP错误，但不显示通用消息，让组件自己处理
        // 只是将完整的错误信息（包括后端返回的msg）传递出去
        return Promise.reject(err)
    }
)

export default instance
