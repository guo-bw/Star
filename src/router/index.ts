import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/student',
    component: () => import('@/layouts/StudentLayout.vue'),
    meta: { requiresAuth: true, role: 'student' },
    children: [
      {
        path: '',
        redirect: '/student/dashboard'
      },
      {
        path: 'dashboard',
        name: 'StudentDashboard',
        component: () => import('@/views/student/Dashboard.vue')
      },
      {
        path: 'chat',
        name: 'StudentChat',
        component: () => import('@/views/student/Chat.vue')
      },
      {
        path: 'grades',
        name: 'StudentGrades',
        component: () => import('@/views/student/Grades.vue')
      },
      {
        path: 'assignments',
        name: 'StudentAssignments',
        component: () => import('@/views/student/Assignments.vue')
      },
      {
        path: 'profile',
        name: 'StudentProfile',
        component: () => import('@/views/student/Profile.vue')
      }
    ]
  },
  {
    path: '/teacher',
    component: () => import('@/layouts/TeacherLayout.vue'),
    meta: { requiresAuth: true, role: 'teacher' },
    children: [
      {
        path: '',
        redirect: '/teacher/students'
      },
      {
        path: 'students',
        name: 'TeacherStudents',
        component: () => import('@/views/teacher/Students.vue')
      },
      {
        path: 'students/:id',
        name: 'StudentDetail',
        component: () => import('@/views/teacher/StudentDetail.vue')
      },
      {
        path: 'courses',
        name: 'TeacherCourses',
        component: () => import('@/views/teacher/Courses.vue')
      },
      {
        path: 'knowledge',
        name: 'KnowledgeManagement',
        component: () => import('@/views/teacher/Knowledge.vue')
      },
      {
        path: 'profile',
        name: 'TeacherProfile',
        component: () => import('@/views/teacher/Profile.vue')
      }
    ]
  },
  {
    path: '/',
    redirect: (to) => {
      const authStore = useAuthStore()
      if (authStore.isStudent) return '/student'
      if (authStore.isTeacher) return '/teacher'
      return '/login'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false
  const requiredRole = to.meta.role as string | undefined

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (requiredRole && authStore.userRole !== requiredRole) {
    // 角色不匹配，重定向到对应的首页
    if (authStore.isStudent) {
      next('/student')
    } else if (authStore.isTeacher) {
      next('/teacher')
    } else {
      next('/login')
    }
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    // 已登录用户访问登录页，重定向到首页
    if (authStore.isStudent) {
      next('/student')
    } else if (authStore.isTeacher) {
      next('/teacher')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router

