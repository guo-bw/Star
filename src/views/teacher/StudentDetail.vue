<template>
  <div>
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <h1 class="page-title" style="margin: 0;">学生详情</h1>
      </template>
    </el-page-header>

    <div style="margin-top: 20px;">
      <!-- 学生基本信息 -->
      <div class="card">
        <h2>基本信息</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">
            {{ student?.full_name }}
          </el-descriptions-item>
          <el-descriptions-item label="学号">
            {{ student?.student_id }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ student?.email }}
          </el-descriptions-item>
          <el-descriptions-item label="电话">
            {{ student?.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDate(student?.created_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 成绩概览 -->
      <div class="card">
        <h2>成绩概览</h2>
        <el-row :gutter="20" style="margin-bottom: 20px;">
          <el-col :span="6">
            <el-statistic title="平均分" :value="stats.averageScore" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最高分" :value="stats.highestScore" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最低分" :value="stats.lowestScore" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="课程数" :value="grades.length" />
          </el-col>
        </el-row>

        <el-table :data="grades" v-loading="loading">
          <el-table-column prop="course.name" label="课程" />
          <el-table-column prop="exam_type" label="考试类型" />
          <el-table-column label="分数">
            <template #default="{ row }">
              <el-tag :type="getScoreType(row.score)">
                {{ row.score }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="grade_letter" label="等级" />
          <el-table-column label="考试日期">
            <template #default="{ row }">
              {{ formatDate(row.exam_date) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 作业情况 -->
      <div class="card">
        <h2>作业情况</h2>
        <el-table :data="submissions" v-loading="loading">
          <el-table-column prop="assignment.title" label="作业名称" />
          <el-table-column prop="assignment.course.name" label="课程" />
          <el-table-column label="状态">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间">
            <template #default="{ row }">
              {{ formatDate(row.submitted_at) }}
            </template>
          </el-table-column>
          <el-table-column label="得分">
            <template #default="{ row }">
              {{ row.score || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- AI 对话记录 -->
      <div class="card">
        <h2>AI 对话记录</h2>
        <el-timeline>
          <el-timeline-item
            v-for="message in chatMessages"
            :key="message.id"
            :timestamp="formatDate(message.created_at)"
            placement="top"
          >
            <el-card>
              <p><strong>{{ message.role === 'user' ? '学生' : 'AI' }}：</strong></p>
              <p>{{ message.content }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <div v-if="chatMessages.length === 0" style="text-align: center; color: #909399;">
          暂无对话记录
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import dayjs from 'dayjs'
import type { Profile, Grade, AssignmentSubmission, ChatMessage } from '@/types'

const route = useRoute()
const router = useRouter()
const loading = ref(false)

const studentId = route.params.id as string

const student = ref<Profile>()
const grades = ref<Grade[]>([])
const submissions = ref<AssignmentSubmission[]>([])
const chatMessages = ref<ChatMessage[]>([])

const stats = computed(() => {
  if (grades.value.length === 0) {
    return {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0
    }
  }

  const scores = grades.value.map(g => g.score || 0)
  const total = scores.reduce((sum, s) => sum + s, 0)

  return {
    averageScore: Math.round(total / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores)
  }
})

onMounted(() => {
  fetchStudentData()
})

const fetchStudentData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchStudent(),
      fetchGrades(),
      fetchSubmissions(),
      fetchChatMessages()
    ])
  } finally {
    loading.value = false
  }
}

const fetchStudent = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single()

  if (data) {
    student.value = data
  }
}

const fetchGrades = async () => {
  const { data } = await supabase
    .from('grades')
    .select('*, course:courses(*)')
    .eq('student_id', studentId)
    .order('exam_date', { ascending: false })

  if (data) {
    grades.value = data
  }
}

const fetchSubmissions = async () => {
  const { data } = await supabase
    .from('assignment_submissions')
    .select('*, assignment:assignments(*, course:courses(*))')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (data) {
    submissions.value = data
  }
}

const fetchChatMessages = async () => {
  // 获取学生的对话会话
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', studentId)

  if (!sessions || sessions.length === 0) return

  const sessionIds = sessions.map(s => s.id)

  // 获取最近20条消息
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: false })
    .limit(20)

  if (data) {
    chatMessages.value = data.reverse()
  }
}

const goBack = () => {
  router.back()
}

const formatDate = (date?: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

const getScoreType = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 80) return undefined
  if (score >= 60) return 'warning'
  return 'danger'
}

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    pending: 'warning',
    submitted: 'info',
    graded: 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待提交',
    submitted: '已提交',
    graded: '已批改'
  }
  return map[status] || status
}
</script>

