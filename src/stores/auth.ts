import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import type { Profile, UserRole } from '@/types'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => profile.value?.role)
  const isStudent = computed(() => userRole.value === 'student')
  const isTeacher = computed(() => userRole.value === 'teacher')

  // 初始化认证状态
  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        user.value = session.user
        await fetchProfile()
      }

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(async (event, session) => {
        user.value = session?.user || null
        if (session?.user) {
          await fetchProfile()
        } else {
          profile.value = null
        }
      })
    } catch (error) {
      console.error('初始化认证失败:', error)
    }
  }

  // 获取用户资料
  async function fetchProfile() {
    if (!user.value) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      profile.value = data
    } catch (error) {
      console.error('获取用户资料失败:', error)
    }
  }

  // 登录
  async function signIn(email: string, password: string) {
    try {
      loading.value = true
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      user.value = data.user
      await fetchProfile()
      
      ElMessage.success('登录成功')
      return { data, error: null }
    } catch (error: any) {
      ElMessage.error(error.message || '登录失败')
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  // 注册
  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    studentId?: string
  ) {
    try {
      loading.value = true

      // 1. 创建认证用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('注册失败')

      // 2. 创建用户资料
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
          student_id: studentId,
        })

      if (profileError) throw profileError

      ElMessage.success('注册成功，请登录')
      return { data: authData, error: null }
    } catch (error: any) {
      ElMessage.error(error.message || '注册失败')
      return { data: null, error }
    } finally {
      loading.value = false
    }
  }

  // 登出
  async function signOut() {
    try {
      loading.value = true
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      profile.value = null
      ElMessage.success('已退出登录')
    } catch (error: any) {
      ElMessage.error(error.message || '退出失败')
    } finally {
      loading.value = false
    }
  }

  // 更新资料
  async function updateProfile(updates: Partial<Profile>) {
    if (!user.value) return

    try {
      loading.value = true
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)

      if (error) throw error

      await fetchProfile()
      ElMessage.success('资料更新成功')
      return { error: null }
    } catch (error: any) {
      ElMessage.error(error.message || '更新失败')
      return { error }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    userRole,
    isStudent,
    isTeacher,
    initialize,
    fetchProfile,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
})

