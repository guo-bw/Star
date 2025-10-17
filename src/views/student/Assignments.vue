<template>
  <div>
    <h1 class="page-title">作业提交</h1>

    <div class="card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="待提交" name="pending">
          <AssignmentList
            :assignments="pendingAssignments"
            :loading="loading"
            @submit="handleSubmit"
          />
        </el-tab-pane>
        <el-tab-pane label="已提交" name="submitted">
          <AssignmentList
            :assignments="submittedAssignments"
            :loading="loading"
            :show-submit="false"
          />
        </el-tab-pane>
        <el-tab-pane label="已批改" name="graded">
          <AssignmentList
            :assignments="gradedAssignments"
            :loading="loading"
            :show-submit="false"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 提交对话框 -->
    <el-dialog
      v-model="submitDialogVisible"
      title="提交作业"
      width="600px"
    >
      <el-form :model="submitForm" label-width="80px">
        <el-form-item label="作业名称">
          <span>{{ currentAssignment?.title }}</span>
        </el-form-item>
        <el-form-item label="提交内容">
          <el-input
            v-model="submitForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入作业内容或说明"
          />
        </el-form-item>
        <el-form-item label="附件">
          <el-input
            v-model="submitForm.file_url"
            placeholder="文件链接（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSubmit">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import AssignmentList from '@/components/AssignmentList.vue'
import type { Assignment, AssignmentSubmission } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('pending')
const submitDialogVisible = ref(false)

const assignments = ref<(Assignment & { submission?: AssignmentSubmission })[]>([])
const currentAssignment = ref<Assignment>()

const submitForm = ref({
  content: '',
  file_url: ''
})

const pendingAssignments = computed(() =>
  assignments.value.filter(a => !a.submission || a.submission.status === 'pending')
)

const submittedAssignments = computed(() =>
  assignments.value.filter(a => a.submission?.status === 'submitted')
)

const gradedAssignments = computed(() =>
  assignments.value.filter(a => a.submission?.status === 'graded')
)

onMounted(() => {
  fetchAssignments()
})

const fetchAssignments = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  loading.value = true
  try {
    // 获取学生的班级
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', userId)

    if (!studentClasses || studentClasses.length === 0) return

    const classIds = studentClasses.map(sc => sc.class_id)

    // 获取课程
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .in('class_id', classIds)

    if (!courses || courses.length === 0) return

    const courseIds = courses.map(c => c.id)

    // 获取作业
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, course:courses(*)')
      .in('course_id', courseIds)
      .order('due_date', { ascending: false })

    if (!assignmentsData) return

    // 获取提交记录
    const assignmentIds = assignmentsData.map(a => a.id)
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('student_id', userId)
      .in('assignment_id', assignmentIds)

    const submissionMap = new Map(
      submissions?.map(s => [s.assignment_id, s]) || []
    )

    assignments.value = assignmentsData.map(a => ({
      ...a,
      submission: submissionMap.get(a.id)
    }))
  } catch (error) {
    console.error('获取作业失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = (assignment: Assignment) => {
  currentAssignment.value = assignment
  submitForm.value = {
    content: '',
    file_url: ''
  }
  submitDialogVisible.value = true
}

const confirmSubmit = async () => {
  const userId = authStore.user?.id
  if (!userId || !currentAssignment.value) return

  submitting.value = true
  try {
    const { error } = await supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: currentAssignment.value.id,
        student_id: userId,
        status: 'submitted',
        content: submitForm.value.content,
        file_url: submitForm.value.file_url || undefined,
        submitted_at: new Date().toISOString()
      })

    if (error) throw error

    ElMessage.success('作业提交成功')
    submitDialogVisible.value = false
    await fetchAssignments()
  } catch (error: any) {
    console.error('提交作业失败:', error)
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

