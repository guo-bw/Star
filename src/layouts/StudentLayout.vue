<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <span>启明星 - 学生端</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/student/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>学习看板</span>
        </el-menu-item>
        <el-menu-item index="/student/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI 助手</span>
        </el-menu-item>
        <el-menu-item index="/student/grades">
          <el-icon><Document /></el-icon>
          <span>我的成绩</span>
        </el-menu-item>
        <el-menu-item index="/student/assignments">
          <el-icon><EditPen /></el-icon>
          <span>作业提交</span>
        </el-menu-item>
        <el-menu-item index="/student/exams">
          <el-icon><Timer /></el-icon>
          <span>考试安排</span>
        </el-menu-item>
        <el-menu-item index="/student/profile">
          <el-icon><User /></el-icon>
          <span>个人资料</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="main-container">
      <header class="header">
        <div class="header-left">
          <span style="font-size: 16px; color: #303133;">
            欢迎，{{ authStore.profile?.full_name }}
          </span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="el-dropdown-link">
              <el-avatar :size="36">{{ getUserInitial }}</el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessageBox } from 'element-plus'
import {
  DataLine,
  ChatDotRound,
  Document,
  EditPen,
  User,
  Timer
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)

const getUserInitial = computed(() => {
  return authStore.profile?.full_name?.charAt(0) || 'U'
})

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.signOut()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/student/profile')
  }
}
</script>

