// 用户角色
export type UserRole = 'student' | 'teacher'

// 作业状态
export type AssignmentStatus = 'pending' | 'submitted' | 'graded'

// 用户资料
export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  student_id?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// 班级
export interface Class {
  id: string
  name: string
  grade?: string
  major?: string
  teacher_id?: string
  created_at: string
}

// 课程
export interface Course {
  id: string
  name: string
  code: string
  description?: string
  credits?: number
  teacher_id?: string
  class_id?: string
  semester?: string
  created_at: string
}

// 成绩
export interface Grade {
  id: string
  student_id: string
  course_id: string
  score: number
  grade_letter?: string
  exam_type?: string
  exam_date?: string
  remarks?: string
  created_at: string
  course?: Course
}

// 作业
export interface Assignment {
  id: string
  course_id: string
  title: string
  description?: string
  due_date: string
  total_points: number
  created_at: string
  course?: Course
}

// 作业提交
export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  status: AssignmentStatus
  submitted_at?: string
  content?: string
  file_url?: string
  score?: number
  feedback?: string
  graded_at?: string
  created_at: string
  assignment?: Assignment
}

// 考试
export interface Exam {
  id: string
  course_id: string
  title: string
  exam_date: string
  duration_minutes?: number
  location?: string
  description?: string
  created_at: string
  course?: Course
}

// 聊天会话
export interface ChatSession {
  id: string
  user_id: string
  title?: string
  created_at: string
  updated_at: string
}

// 聊天消息
export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  context_used?: any
  created_at: string
}

// 学习计划
export interface StudyPlan {
  id: string
  student_id: string
  title: string
  description?: string
  target_date?: string
  completed: boolean
  created_at: string
}

// 知识库文档
export interface KnowledgeDocument {
  id: string
  title: string
  file_name: string
  file_url: string
  file_type?: string
  course_id?: string
  uploaded_by?: string
  processed: boolean
  created_at: string
}

// API 响应类型
export interface ApiResponse<T = any> {
  data?: T
  error?: {
    message: string
    code?: string
  }
}

// RAG 聊天请求
export interface RagChatRequest {
  message: string
  session_id?: string
  user_id: string
}

// RAG 聊天响应
export interface RagChatResponse {
  answer: string
  session_id: string
  sources?: Array<{
    content: string
    similarity: number
  }>
}

