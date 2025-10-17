<template>
  <div>
    <h1 class="page-title">知识库管理</h1>

    <div class="card">
      <el-button type="primary" @click="showUploadDialog" style="margin-bottom: 20px;">
        上传文档
      </el-button>

      <el-table :data="documents" v-loading="loading" stripe>
        <el-table-column prop="title" label="文档标题" />
        <el-table-column prop="file_name" label="文件名" />
        <el-table-column prop="file_type" label="文件类型" />
        <el-table-column prop="course.name" label="关联课程" />
        <el-table-column label="处理状态">
          <template #default="{ row }">
            <el-tag :type="row.processed ? 'success' : 'warning'">
              {{ row.processed ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="danger" @click="deleteDocument(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文档" width="600px">
      <el-form :model="uploadForm" label-width="100px">
        <el-form-item label="文档标题" required>
          <el-input v-model="uploadForm.title" />
        </el-form-item>
        <el-form-item label="关联课程">
          <el-select v-model="uploadForm.course_id" placeholder="选择课程（可选）">
            <el-option
              v-for="course in courses"
              :key="course.id"
              :label="course.name"
              :value="course.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文件URL" required>
          <el-input
            v-model="uploadForm.file_url"
            placeholder="请输入文件的公开访问链接"
          />
          <div style="margin-top: 10px; color: #909399; font-size: 12px;">
            提示：请先将文件上传到 Supabase Storage 或其他云存储，然后粘贴URL
          </div>
        </el-form-item>
        <el-form-item label="文件名" required>
          <el-input v-model="uploadForm.file_name" />
        </el-form-item>
        <el-form-item label="文件类型">
          <el-select v-model="uploadForm.file_type">
            <el-option label="PDF" value="pdf" />
            <el-option label="Word" value="docx" />
            <el-option label="文本" value="txt" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">
          上传
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
import dayjs from 'dayjs'
import type { KnowledgeDocument, Course } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const uploading = ref(false)
const uploadDialogVisible = ref(false)

const documents = ref<KnowledgeDocument[]>([])
const courses = ref<Course[]>([])

const uploadForm = ref({
  title: '',
  file_url: '',
  file_name: '',
  file_type: 'pdf',
  course_id: ''
})

onMounted(() => {
  fetchCourses()
  fetchDocuments()
})

const fetchCourses = async () => {
  const { data } = await supabase
    .from('courses')
    .select('*')
    .order('name')

  if (data) {
    courses.value = data
  }
}

const fetchDocuments = async () => {
  loading.value = true
  try {
    const { data } = await supabase
      .from('knowledge_documents')
      .select('*, course:courses(*)')
      .order('created_at', { ascending: false })

    if (data) {
      documents.value = data
    }
  } finally {
    loading.value = false
  }
}

const showUploadDialog = () => {
  uploadForm.value = {
    title: '',
    file_url: '',
    file_name: '',
    file_type: 'pdf',
    course_id: ''
  }
  uploadDialogVisible.value = true
}

const handleUpload = async () => {
  if (!uploadForm.value.title || !uploadForm.value.file_url || !uploadForm.value.file_name) {
    ElMessage.error('请填写必填项')
    return
  }

  uploading.value = true
  try {
    const { error } = await supabase
      .from('knowledge_documents')
      .insert({
        title: uploadForm.value.title,
        file_url: uploadForm.value.file_url,
        file_name: uploadForm.value.file_name,
        file_type: uploadForm.value.file_type,
        course_id: uploadForm.value.course_id || undefined,
        uploaded_by: authStore.user?.id
      })

    if (error) throw error

    ElMessage.success('上传成功，文档将在后台处理')
    uploadDialogVisible.value = false

    // 调用处理函数
    await processDocument(uploadForm.value.file_url)
    
    await fetchDocuments()
  } catch (error: any) {
    ElMessage.error(error.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

const processDocument = async (fileUrl: string) => {
  try {
    // 调用 Edge Function 处理文档
    await supabase.functions.invoke('knowledge-upload', {
      body: { file_url: fileUrl }
    })
  } catch (error) {
    console.error('处理文档失败:', error)
  }
}

const deleteDocument = async (doc: KnowledgeDocument) => {
  await ElMessageBox.confirm('确定要删除这个文档吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })

  try {
    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', doc.id)

    if (error) throw error

    ElMessage.success('删除成功')
    await fetchDocuments()
  } catch (error: any) {
    ElMessage.error(error.message || '删除失败')
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

