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
        <el-table-column prop="file_type" label="文件类型" width="100" />
        <el-table-column prop="course.name" label="关联课程" />
        <el-table-column label="处理状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.processed ? 'success' : 'warning'">
              {{ row.processed ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="downloadFile(row)">
              下载
            </el-button>
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
          <el-input v-model="uploadForm.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="关联课程">
          <el-select v-model="uploadForm.course_id" placeholder="选择课程（可选）" clearable>
            <el-option
              v-for="course in courses"
              :key="course.id"
              :label="course.name"
              :value="course.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择文件" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :accept="fileAccept"
            drag
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                <p>支持 PDF、Word、TXT 格式，文件大小不超过 10MB</p>
                <p style="color: #E6A23C; margin-top: 5px;">
                  ⚠️ 当前仅 TXT 文件支持自动向量化处理，PDF/Word 文件需要额外配置
                </p>
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
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!canUpload" @click="handleUpload">
          {{ uploading ? '上传中...' : '确认上传' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import dayjs from 'dayjs'
import { uploadKnowledgeDoc, deleteFile, STORAGE_BUCKETS, FILE_TYPES, formatFileSize as formatSize, getFileType } from '@/utils/storage'
import type { KnowledgeDocument, Course } from '@/types'

const authStore = useAuthStore()
const loading = ref(false)
const uploading = ref(false)
const uploadDialogVisible = ref(false)
const uploadProgress = ref(0)
const uploadRef = ref<UploadInstance>()

const documents = ref<KnowledgeDocument[]>([])
const courses = ref<Course[]>([])
const selectedFile = ref<File | null>(null)

const uploadForm = ref({
  title: '',
  course_id: ''
})

const fileAccept = FILE_TYPES.KNOWLEDGE_DOCS.accept

const canUpload = computed(() => {
  return uploadForm.value.title && selectedFile.value
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
    course_id: ''
  }
  selectedFile.value = null
  uploadProgress.value = 0
  uploadDialogVisible.value = true
}

const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw || null
  
  // 自动填充标题（如果还没有填写）
  if (!uploadForm.value.title && file.name) {
    uploadForm.value.title = file.name.replace(/\.[^/.]+$/, '')
  }
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const clearFile = () => {
  selectedFile.value = null
  uploadRef.value?.clearFiles()
}

const handleUpload = async () => {
  if (!canUpload.value) {
    ElMessage.error('请填写标题并选择文件')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    // 上传文件到 Storage
    ElMessage.info('正在上传文件...')
    uploadProgress.value = 30
    
    const result = await uploadKnowledgeDoc(selectedFile.value!)
    uploadProgress.value = 60

    // 保存文档记录到数据库
    const fileType = getFileType(selectedFile.value!.name)
    const { error } = await supabase
      .from('knowledge_documents')
      .insert({
        title: uploadForm.value.title,
        file_url: result.url,
        file_name: selectedFile.value!.name,
        file_type: fileType,
        course_id: uploadForm.value.course_id || undefined,
        uploaded_by: authStore.user?.id
      })

    if (error) throw error
    uploadProgress.value = 80

    ElMessage.success('文件上传成功，正在处理文档...')

    // 调用处理函数（异步处理，不等待完成）
    processDocument(result.url).catch(err => {
      console.error('处理文档失败:', err)
      ElMessage.warning('文档已上传，但处理失败，请稍后重试')
    })

    uploadProgress.value = 100
    uploadDialogVisible.value = false
    
    await fetchDocuments()
  } catch (error: any) {
    console.error('Upload error:', error)
    ElMessage.error(error.message || '上传失败')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const processDocument = async (fileUrl: string) => {
  try {
    // 调用 Edge Function 处理文档
    const { error } = await supabase.functions.invoke('knowledge-upload', {
      body: { file_url: fileUrl }
    })
    
    if (error) throw error
  } catch (error) {
    console.error('处理文档失败:', error)
    throw error
  }
}

const downloadFile = (doc: KnowledgeDocument) => {
  window.open(doc.file_url, '_blank')
}

const deleteDocument = async (doc: KnowledgeDocument) => {
  await ElMessageBox.confirm('确定要删除这个文档吗？删除后无法恢复。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })

  try {
    // 从数据库删除记录
    const { error: dbError } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', doc.id)

    if (dbError) throw dbError

    // 尝试从 Storage 删除文件（如果文件路径包含用户ID）
    try {
      if (doc.file_url.includes(STORAGE_BUCKETS.KNOWLEDGE_DOCS)) {
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split('/')
        const bucketIndex = pathParts.indexOf(STORAGE_BUCKETS.KNOWLEDGE_DOCS)
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/')
          await deleteFile(STORAGE_BUCKETS.KNOWLEDGE_DOCS, filePath)
        }
      }
    } catch (storageError) {
      console.error('删除 Storage 文件失败:', storageError)
      // 不影响主流程，继续执行
    }

    ElMessage.success('删除成功')
    await fetchDocuments()
  } catch (error: any) {
    console.error('Delete error:', error)
    ElMessage.error(error.message || '删除失败')
  }
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const formatFileSize = formatSize
</script>

