<template>
  <div>
    <h1 class="page-title">我的成绩</h1>

    <div class="card">
      <!-- 统计信息 -->
      <el-row :gutter="20" style="margin-bottom: 20px;">
        <el-col :span="6">
          <el-statistic title="平均分" :value="averageScore" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="最高分" :value="highestScore" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="最低分" :value="lowestScore" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="课程数" :value="grades.length" />
        </el-col>
      </el-row>

      <el-divider />

      <!-- 成绩列表 -->
      <el-table :data="grades" v-loading="loading" stripe>
        <el-table-column prop="course.name" label="课程名称" />
        <el-table-column prop="course.code" label="课程代码" />
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
        <el-table-column prop="remarks" label="备注" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import type { Grade } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const grades = ref<Grade[]>([])

const averageScore = computed(() => {
  if (grades.value.length === 0) return 0
  const total = grades.value.reduce((sum, g) => sum + (g.score || 0), 0)
  return Math.round(total / grades.value.length)
})

const highestScore = computed(() => {
  if (grades.value.length === 0) return 0
  return Math.max(...grades.value.map(g => g.score || 0))
})

const lowestScore = computed(() => {
  if (grades.value.length === 0) return 0
  return Math.min(...grades.value.map(g => g.score || 0))
})

onMounted(() => {
  fetchGrades()
})

const fetchGrades = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  loading.value = true
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*, course:courses(*)')
      .eq('student_id', userId)
      .order('exam_date', { ascending: false })

    if (error) throw error
    grades.value = data || []
  } catch (error) {
    console.error('获取成绩失败:', error)
  } finally {
    loading.value = false
  }
}

const getScoreType = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 80) return ''
  if (score >= 60) return 'warning'
  return 'danger'
}

const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}
</script>

