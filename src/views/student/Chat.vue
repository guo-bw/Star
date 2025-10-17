<template>
  <div class="chat-page">
    <h1 class="page-title">AI 智能助手</h1>

    <div class="chat-container">
      <!-- 对话历史 -->
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            {{ message.role === 'user' ? 'U' : 'AI' }}
          </div>
          <div class="message-content">
            {{ message.content }}
          </div>
        </div>

        <div v-if="loading" class="message assistant">
          <div class="message-avatar">AI</div>
          <div class="message-content">
            <el-icon class="is-loading"><Loading /></el-icon>
            正在思考...
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入您的问题，比如：我的高数成绩怎么样？"
          @keydown.enter.prevent="handleSend"
        >
          <template #append>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleSend"
            >
              发送
            </el-button>
          </template>
        </el-input>
        <div style="margin-top: 10px; color: #909399; font-size: 12px;">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import type { ChatMessage } from '@/types'

const authStore = useAuthStore()
const messagesRef = ref<HTMLElement>()
const inputMessage = ref('')
const loading = ref(false)
const currentSessionId = ref<string>()

const messages = ref<ChatMessage[]>([])

onMounted(async () => {
  // 获取或创建会话
  await getOrCreateSession()
  // 加载历史消息
  await loadMessages()
})

const getOrCreateSession = async () => {
  const userId = authStore.user?.id
  if (!userId) return

  // 获取最近的会话
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (sessions && sessions.length > 0) {
    currentSessionId.value = sessions[0].id
  } else {
    // 创建新会话
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: '新对话'
      })
      .select()
      .single()

    if (error) {
      console.error('创建会话失败:', error)
      return
    }
    currentSessionId.value = data.id
  }
}

const loadMessages = async () => {
  if (!currentSessionId.value) return

  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', currentSessionId.value)
    .order('created_at', { ascending: true })

  if (data) {
    messages.value = data
    await nextTick()
    scrollToBottom()
  }
}

const handleSend = async () => {
  if (!inputMessage.value.trim() || loading.value) return

  const userId = authStore.user?.id
  if (!userId || !currentSessionId.value) {
    ElMessage.error('会话未初始化')
    return
  }

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息到界面
  const tempUserMsg: ChatMessage = {
    id: Date.now().toString(),
    session_id: currentSessionId.value,
    role: 'user',
    content: userMessage,
    created_at: new Date().toISOString()
  }
  messages.value.push(tempUserMsg)

  // 保存用户消息到数据库
  await supabase.from('chat_messages').insert({
    session_id: currentSessionId.value,
    role: 'user',
    content: userMessage
  })

  await nextTick()
  scrollToBottom()

  // 调用 RAG API
  loading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('rag-chat', {
      body: {
        message: userMessage,
        session_id: currentSessionId.value,
        user_id: userId
      }
    })

    if (error) throw error

    // 添加 AI 回复
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      session_id: currentSessionId.value,
      role: 'assistant',
      content: data.answer || '抱歉，我暂时无法回答这个问题。',
      context_used: data.sources,
      created_at: new Date().toISOString()
    }
    messages.value.push(aiMessage)

    // 保存 AI 消息到数据库
    await supabase.from('chat_messages').insert({
      session_id: currentSessionId.value,
      role: 'assistant',
      content: aiMessage.content,
      context_used: aiMessage.context_used
    })

    await nextTick()
    scrollToBottom()
  } catch (error: any) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送失败，请重试')
  } finally {
    loading.value = false
  }
}

const scrollToBottom = () => {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  flex: 1;
  min-height: 0;
}
</style>

