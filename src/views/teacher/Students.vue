<template>
  <div>
    <h1 class="page-title">学生管理</h1>

    <div class="card">
      <!-- 搜索栏 -->
      <el-row :gutter="20" style="margin-bottom: 20px;">
        <el-col :span="8">
          <el-input
            v-model="searchQuery"
            placeholder="搜索学生姓名或学号"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="selectedClass"
            placeholder="选择班级"
            clearable
            @change="fetchStudents"
          >
            <el-option
              v-for="cls in classes"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            />
          </el-select>
        </el-col>
      </el-row>

      <!-- 学生列表 -->
      <el-table :data="filteredStudents" v-loading="loading" stripe>
        <el-table-column prop="student_id" label="学号" width="120" />
        <el-table-column prop="full_name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="phone" label="电话" />
        <el-table-column label="平均分" width="100">
          <template #default="{ row }">
            {{ row.average_score || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="viewStudent(row)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { Profile, Class } from '@/types'

const router = useRouter()
const loading = ref(false)
const searchQuery = ref('')
const selectedClass = ref('')

const students = ref<(Profile & { average_score?: number })[]>([])
const classes = ref<Class[]>([])

const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value
  
  const query = searchQuery.value.toLowerCase()
  return students.value.filter(
    s =>
      s.full_name.toLowerCase().includes(query) ||
      s.student_id?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  fetchClasses()
  fetchStudents()
})

const fetchClasses = async () => {
  const { data } = await supabase
    .from('classes')
    .select('*')
    .order('name')

  if (data) {
    classes.value = data
  }
}

const fetchStudents = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    // 如果选择了班级，过滤学生
    if (selectedClass.value) {
      const { data: studentClasses } = await supabase
        .from('student_classes')
        .select('student_id')
        .eq('class_id', selectedClass.value)

      if (studentClasses && studentClasses.length > 0) {
        const studentIds = studentClasses.map(sc => sc.student_id)
        query = query.in('id', studentIds)
      } else {
        students.value = []
        return
      }
    }

    const { data } = await query

    if (data) {
      // 获取每个学生的平均分
      const studentsWithScores = await Promise.all(
        data.map(async student => {
          const { data: grades } = await supabase
            .from('grades')
            .select('score')
            .eq('student_id', student.id)

          let averageScore = 0
          if (grades && grades.length > 0) {
            const total = grades.reduce((sum, g) => sum + (g.score || 0), 0)
            averageScore = Math.round(total / grades.length)
          }

          return {
            ...student,
            average_score: averageScore
          }
        })
      )

      students.value = studentsWithScores
    }
  } catch (error) {
    console.error('获取学生列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // 搜索通过 computed 自动处理
}

const viewStudent = (student: Profile) => {
  router.push(`/teacher/students/${student.id}`)
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

