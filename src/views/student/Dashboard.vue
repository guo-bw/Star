<template>
  <div class="dashboard">
    <h1 class="page-title">学习看板</h1>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">平均分</div>
        <div class="stat-value" style="color: #409eff;">{{ stats.averageScore }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">课程数</div>
        <div class="stat-value" style="color: #67c23a;">{{ stats.totalCourses }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">待交作业</div>
        <div class="stat-value" style="color: #e6a23c;">{{ stats.pendingAssignments }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">即将考试</div>
        <div class="stat-value" style="color: #f56c6c;">{{ stats.upcomingExams }}</div>
      </div>
    </div>

    <!-- 近期作业 -->
    <div class="card">
      <h2 style="margin-bottom: 15px;">近期作业</h2>
      <el-table :data="assignments" v-loading="loading">
        <el-table-column prop="title" label="作业名称" />
        <el-table-column prop="course.name" label="课程" />
        <el-table-column label="截止时间">
          <template #default="{ row }">
            {{ formatDate(row.due_date) }}
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="goToAssignments"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 近期考试 -->
    <div class="card">
      <h2 style="margin-bottom: 15px;">近期考试</h2>
      <el-table :data="exams" v-loading="loading">
        <el-table-column prop="title" label="考试名称" />
        <el-table-column prop="course.name" label="课程" />
        <el-table-column label="考试时间">
          <template #default="{ row }">
            {{ formatDate(row.exam_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="location" label="地点" />
        <el-table-column label="时长">
          <template #default="{ row }">
            {{ row.duration_minutes }}分钟
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import type { Assignment, Exam, AssignmentSubmission } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const stats = ref({
  averageScore: 0,
  totalCourses: 0,
  pendingAssignments: 0,
  upcomingExams: 0
})

const assignments = ref<(Assignment & { status?: string })[]>([])
const exams = ref<Exam[]>([])

onMounted(() => {
  fetchDashboardData()
})

const fetchDashboardData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchStats(),
      fetchAssignments(),
      fetchExams()
    ])
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  // 获取平均分
  const { data: grades } = await supabase
    .from('grades')
    .select('score')
    .eq('student_id', userId)

  if (grades && grades.length > 0) {
    const total = grades.reduce((sum, g) => sum + (g.score || 0), 0)
    stats.value.averageScore = Math.round(total / grades.length)
    stats.value.totalCourses = grades.length
  }

  // 获取待交作业数
  const { data: submissions, count } = await supabase
    .from('assignment_submissions')
    .select('*', { count: 'exact' })
    .eq('student_id', userId)
    .eq('status', 'pending')

  stats.value.pendingAssignments = count || 0

  // 获取即将考试数
  const { count: examCount } = await supabase
    .from('exams')
    .select('*', { count: 'exact' })
    .gte('exam_date', new Date().toISOString())

  stats.value.upcomingExams = examCount || 0
}

const fetchAssignments = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  // 获取学生的班级
  const { data: studentClasses } = await supabase
    .from('student_classes')
    .select('class_id')
    .eq('student_id', userId)

  if (!studentClasses || studentClasses.length === 0) return

  const classIds = studentClasses.map(sc => sc.class_id)

  // 获取班级的课程
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .in('class_id', classIds)

  if (!courses || courses.length === 0) return

  const courseIds = courses.map(c => c.id)

  // 获取近期作业
  const { data } = await supabase
    .from('assignments')
    .select('*, course:courses(*)')
    .in('course_id', courseIds)
    .gte('due_date', new Date().toISOString())
    .order('due_date', { ascending: true })
    .limit(5)

  if (data) {
    // 获取提交状态
    const assignmentIds = data.map(a => a.id)
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, status')
      .eq('student_id', userId)
      .in('assignment_id', assignmentIds)

    const submissionMap = new Map(
      submissions?.map(s => [s.assignment_id, s.status]) || []
    )

    assignments.value = data.map(a => ({
      ...a,
      status: submissionMap.get(a.id) || 'pending'
    }))
  }
}

const fetchExams = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  // 类似作业的逻辑获取考试
  const { data: studentClasses } = await supabase
    .from('student_classes')
    .select('class_id')
    .eq('student_id', userId)

  if (!studentClasses || studentClasses.length === 0) return

  const classIds = studentClasses.map(sc => sc.class_id)

  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .in('class_id', classIds)

  if (!courses || courses.length === 0) return

  const courseIds = courses.map(c => c.id)

  const { data } = await supabase
    .from('exams')
    .select('*, course:courses(*)')
    .in('course_id', courseIds)
    .gte('exam_date', new Date().toISOString())
    .order('exam_date', { ascending: true })
    .limit(5)

  if (data) {
    exams.value = data
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
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

const goToAssignments = () => {
  router.push('/student/assignments')
}
</script>

