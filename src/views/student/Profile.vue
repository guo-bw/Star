<template>
  <div>
    <h1 class="page-title">个人资料</h1>

    <div class="card">
      <el-form
        ref="formRef"
        :model="form"
        label-width="100px"
        style="max-width: 600px;"
      >
        <el-form-item label="姓名">
          <el-input v-model="form.full_name" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" disabled />
        </el-form-item>
        <el-form-item label="学号">
          <el-input v-model="form.student_id" disabled />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="authStore.loading"
            @click="handleUpdate"
          >
            保存
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const formRef = ref()

const form = ref({
  full_name: '',
  email: '',
  student_id: '',
  phone: ''
})

onMounted(() => {
  if (authStore.profile) {
    form.value = {
      full_name: authStore.profile.full_name,
      email: authStore.profile.email,
      student_id: authStore.profile.student_id || '',
      phone: authStore.profile.phone || ''
    }
  }
})

const handleUpdate = async () => {
  await authStore.updateProfile({
    full_name: form.value.full_name,
    phone: form.value.phone || undefined
  })
}
</script>

