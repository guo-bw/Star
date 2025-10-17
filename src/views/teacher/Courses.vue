<template>
  <div>
    <h1 class="page-title">课程管理</h1>

    <div class="card">
      <el-button type="primary" @click="showAddDialog" style="margin-bottom: 20px;">
        添加课程
      </el-button>

      <el-table :data="courses" v-loading="loading" stripe>
        <el-table-column prop="name" label="课程名称" />
        <el-table-column prop="code" label="课程代码" />
        <el-table-column prop="credits" label="学分" />
        <el-table-column prop="semester" label="学期" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="editCourse(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="deleteCourse(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑课程' : '添加课程'"
      width="600px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="课程名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="课程代码" required>
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="学分">
          <el-input-number v-model="form.credits" :min="0" :max="10" :step="0.5" />
        </el-form-item>
        <el-form-item label="学期">
          <el-input v-model="form.semester" placeholder="如：2024-2025-1" />
        </el-form-item>
        <el-form-item label="班级">
          <el-select v-model="form.class_id" placeholder="选择班级">
            <el-option
              v-for="cls in classes"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Course, Class } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const courses = ref<Course[]>([])
const classes = ref<Class[]>([])

const form = ref({
  id: '',
  name: '',
  code: '',
  credits: 3,
  semester: '',
  class_id: '',
  description: ''
})

onMounted(() => {
  fetchClasses()
  fetchCourses()
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

const fetchCourses = async () => {
  loading.value = true
  try {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      courses.value = data
    }
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = {
    id: '',
    name: '',
    code: '',
    credits: 3,
    semester: '',
    class_id: '',
    description: ''
  }
  dialogVisible.value = true
}

const editCourse = (course: Course) => {
  isEdit.value = true
  form.value = {
    id: course.id,
    name: course.name,
    code: course.code,
    credits: course.credits || 3,
    semester: course.semester || '',
    class_id: course.class_id || '',
    description: course.description || ''
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.code) {
    ElMessage.error('请填写必填项')
    return
  }

  submitting.value = true
  try {
    const data = {
      name: form.value.name,
      code: form.value.code,
      credits: form.value.credits,
      semester: form.value.semester || undefined,
      class_id: form.value.class_id || undefined,
      description: form.value.description || undefined,
      teacher_id: authStore.user?.id
    }

    if (isEdit.value) {
      const { error } = await supabase
        .from('courses')
        .update(data)
        .eq('id', form.value.id)

      if (error) throw error
      ElMessage.success('更新成功')
    } else {
      const { error } = await supabase
        .from('courses')
        .insert(data)

      if (error) throw error
      ElMessage.success('添加成功')
    }

    dialogVisible.value = false
    await fetchCourses()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const deleteCourse = async (course: Course) => {
  await ElMessageBox.confirm('确定要删除这门课程吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })

  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', course.id)

    if (error) throw error

    ElMessage.success('删除成功')
    await fetchCourses()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}
</script>

