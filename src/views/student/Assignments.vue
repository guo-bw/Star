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
        <el-form-item label="截止时间">
          <span>{{ formatDueDate(currentAssignment?.due_date) }}</span>
        </el-form-item>
        <el-form-item label="提交内容" required>
          <el-input
            v-model="submitForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入作业内容或说明"
          />
        </el-form-item>
        <el-form-item label="上传附件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :on-remove="handleFileRemove"
            :accept="fileAccept"
            drag
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 PDF、Word、TXT、ZIP 格式，文件大小不超过 20MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="selectedFile" label="已选文件">
          <el-tag closable @close="clearFile">
            {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </el-tag>
        </el-form-item>
        <el-form-item v-if="uploadProgress > 0 && uploadProgress < 100" label="上传进度">
          <el-progress :percentage="uploadProgress" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmSubmit">
          {{ submitting ? '提交中...' : '确认提交' }}
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
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import dayjs from 'dayjs'
import AssignmentList from '@/components/AssignmentList.vue'
import { uploadAssignment, FILE_TYPES, formatFileSize as formatSize } from '@/utils/storage'
import type { Assignment, AssignmentSubmission } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('pending')
const submitDialogVisible = ref(false)
const uploadProgress = ref(0)
const uploadRef = ref<UploadInstance>()

const assignments = ref<(Assignment & { submission?: AssignmentSubmission })[]>([])
const currentAssignment = ref<Assignment>()
const selectedFile = ref<File | null>(null)

const submitForm = ref({
  content: '',
  file_url: ''
})

const fileAccept = FILE_TYPES.ASSIGNMENTS.accept

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
  selectedFile.value = null
  uploadProgress.value = 0
  submitDialogVisible.value = true
}

const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw || null
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const handleFileRemove = () => {
  selectedFile.value = null
}

const clearFile = () => {
  selectedFile.value = null
  uploadRef.value?.clearFiles()
}

const formatDueDate = (date?: string) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const formatFileSize = formatSize

const confirmSubmit = async () => {
  const userId = authStore.user?.id
  if (!userId || !currentAssignment.value) return

  if (!submitForm.value.content && !selectedFile.value) {
    ElMessage.error('请至少填写作业内容或上传附件')
    return
  }

  submitting.value = true
  uploadProgress.value = 0

  try {
    let fileUrl = submitForm.value.file_url

    // 如果有选择文件，先上传文件
    if (selectedFile.value) {
      ElMessage.info('正在上传文件...')
      uploadProgress.value = 30
      
      const result = await uploadAssignment(selectedFile.value, currentAssignment.value.id)
      fileUrl = result.url
      uploadProgress.value = 60
    }

    // 提交作业记录
    const { error } = await supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: currentAssignment.value.id,
        student_id: userId,
        status: 'submitted',
        content: submitForm.value.content || undefined,
        file_url: fileUrl || undefined,
        submitted_at: new Date().toISOString()
      })

    if (error) throw error

    uploadProgress.value = 100
    ElMessage.success('作业提交成功')
    submitDialogVisible.value = false
    await fetchAssignments()
  } catch (error: any) {
    console.error('提交作业失败:', error)
    ElMessage.error(error.message || '提交失败，请重试')
  } finally {
    submitting.value = false
    uploadProgress.value = 0
  }
}
</script>

