<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1 class="auth-title">注册账号</h1>
      <p class="auth-subtitle">创建您的启明星账号</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="用户类型" prop="role">
          <el-radio-group v-model="form.role" size="large">
            <el-radio-button label="student">学生</el-radio-button>
            <el-radio-button label="teacher">教师</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="姓名" prop="fullName">
          <el-input
            v-model="form.fullName"
            placeholder="请输入姓名"
            size="large"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱"
            size="large"
          />
        </el-form-item>

        <el-form-item
          v-if="form.role === 'student'"
          label="学号"
          prop="studentId"
        >
          <el-input
            v-model="form.studentId"
            placeholder="请输入学号"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="authStore.loading"
            style="width: 100%"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { FormInstance, FormRules } from 'element-plus'
import type { UserRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()

const form = reactive({
  role: 'student' as UserRole,
  fullName: '',
  email: '',
  studentId: '',
  password: '',
  confirmPassword: ''
})

const validatePass2 = (rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  role: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
  fullName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  studentId: [
    {
      required: true,
      message: '请输入学号',
      trigger: 'blur',
      validator: (rule: any, value: string, callback: any) => {
        if (form.role === 'student' && !value) {
          callback(new Error('请输入学号'))
        } else {
          callback()
        }
      }
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    const { error } = await authStore.signUp(
      form.email,
      form.password,
      form.fullName,
      form.role,
      form.studentId || undefined
    )

    if (!error) {
      router.push('/login')
    }
  })
}
</script>

