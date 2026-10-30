import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, UserVO } from '@/types/auth'
import { useTokenStore } from './token'
import { useReviewStore } from '@/features/vocab/reviewStore'
import { getUserInfo, logout as logoutApi, updateAvatar as updateAvatarApi, updateProfile as updateProfileApi } from '@/api/auth'
import type { UserDTO } from '@/types/auth'

/**
 * 用户状态管理 Store
 * 管理用户信息和登录状态
 */
export const useUserStore = defineStore(
  'user',
  () => {
    // 用户资料由后端恢复，避免跨会话留下个人信息或过期的会员状态。
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_vo')
    const userInfo = ref<UserInfo | null>(null)
    const userVO = ref<UserVO | null>(null)

    // 计算属性：判断用户是否已登录
    const isLoggedIn = computed(() => userInfo.value !== null)

    // 计算属性：获取用户名
    const username = computed(() => userInfo.value?.username || '')

    // 计算属性：获取头像URL
    const avatar = computed(() => userInfo.value?.avatar || '')

    /**
     * 设置用户信息
     * @param info 用户信息对象
     */
    const setUserInfo = (info: UserInfo) => {
      userInfo.value = info
    }

    /**
     * 清除用户信息
     */
    const clearUserInfo = () => {
      userInfo.value = null
      userVO.value = null
    }

    /**
     * 获取并存储当前登录用户信息
     */
    const fetchUserInfo = async () => {
      try {
        const response = await getUserInfo()
        if (response.code === 0 && response.data) {
          const profile: UserVO = response.data
          // 转换为 UserInfo 格式并存储
          const info: UserInfo = {
            // 后端已统一返回字符串 id，这里再做一次兜底转换
            id: String(profile.id),
            email: profile.email,
            username: profile.username,
            avatar: profile.avatarUrl,
            vipLevel: profile.vipLevel,
          }
          setUserInfo(info)
          // 完整资料只在当前页面内存中使用。
          userVO.value = profile
          return profile
        }
        throw new Error(response.msg || '获取用户信息失败')
      } catch (error: any) {
        console.error('获取用户信息失败:', error)
        // 如果 error 是后端返回的响应对象（包含 msg 字段）
        if (error.msg) {
          throw new Error(error.msg)
        }
        // 如果是其他类型的错误
        throw error
      }
    }

    /**
     * 用户登出
     * 调用登出 API 并清除本地数据
     */
    const logout = async () => {
      const tokenStore = useTokenStore()
      
      try {
        // 调用登出 API
        await logoutApi()
        console.log('登出 API 调用成功')
      } catch (error) {
        console.error('登出 API 调用失败:', error)
        // 即使 API 调用失败，也继续清除本地数据
      } finally {
        const reviewStore = useReviewStore()
        reviewStore.restoreReviewData(userInfo.value?.id)
        reviewStore.clearReviewData()
        // 清除用户信息
        clearUserInfo()
        
        // 清除令牌
        tokenStore.removeToken()
      }
    }

    /**
     * 更新用户头像
     * @param file 头像文件
     * @returns Promise<string> 返回新的头像URL
     */
    const updateAvatar = async (file: File): Promise<string> => {
      try {
        console.log('updateAvatar: 开始上传头像')
        const response = await updateAvatarApi(file)
        console.log('updateAvatar: 收到响应', response)
        
        if (response.code === 0 && response.data) {
          const newAvatarUrl = response.data
          
          // 更新本地用户信息中的头像
          if (userInfo.value) {
            userInfo.value.avatar = newAvatarUrl
          }
          if (userVO.value) {
            userVO.value.avatarUrl = newAvatarUrl
          }
          
          console.log('updateAvatar: 头像更新成功', newAvatarUrl)
          return newAvatarUrl
        }
        throw new Error(response.msg || '头像上传失败')
      } catch (error: any) {
        console.error('头像上传失败:', error)
        // 如果 error 是后端返回的响应对象（包含 msg 字段）
        if (error.msg) {
          throw new Error(error.msg)
        }
        // 如果是其他类型的错误
        throw error
      }
    }

    /**
     * 更新用户个人信息
     * @param userDTO 用户信息（只需填写要修改的字段）
     * @returns Promise<void>
     */
    const updateProfile = async (userDTO: UserDTO): Promise<void> => {
      try {
        console.log('updateProfile: 开始更新用户信息', userDTO)
        const response = await updateProfileApi(userDTO)
        console.log('updateProfile: 收到响应', response)
        
        if (response.code === 0) {
          // 更新成功后重新获取用户信息
          await fetchUserInfo()
          console.log('updateProfile: 用户信息更新成功')
        } else {
          throw new Error(response.msg || '用户信息更新失败')
        }
      } catch (error: any) {
        console.error('用户信息更新失败:', error)
        // 如果 error 是后端返回的响应对象（包含 msg 字段）
        if (error.msg) {
          throw new Error(error.msg)
        }
        // 如果是其他类型的错误
        throw error
      }
    }

    return {
      userInfo,
      userVO,
      isLoggedIn,
      username,
      avatar,
      setUserInfo,
      clearUserInfo,
      fetchUserInfo,
      logout,
      updateAvatar,
      updateProfile
    }
  }
)
