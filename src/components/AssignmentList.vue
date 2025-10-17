<template>
  <el-table :data="assignments" :loading="loading" stripe>
    <el-table-column prop="title" label="作业名称" min-width="200" />
    <el-table-column prop="course.name" label="课程" />
    <el-table-column label="截止时间" width="180">
      <template #default="{ row }">
        {{ formatDate(row.due_date) }}
      </template>
    </el-table-column>
    <el-table-column prop="total_points" label="总分" width="80" />
    <el-table-column v-if="!showSubmit" label="得分" width="80">
      <template #default="{ row }">
        {{ row.submission?.score || '-' }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="120">
      <template #default="{ row }">
        <el-button
          v-if="showSubmit"
          link
          type="primary"
          @click="$emit('submit', row)"
        >
          提交作业
        </el-button>
        <el-popover
          v-else-if="row.submission?.feedback"
          placement="left"
          width="300"
          trigger="hover"
        >
          <template #reference>
            <el-button link type="primary">查看反馈</el-button>
          </template>
          <div>
            <p><strong>反馈：</strong></p>
            <p>{{ row.submission.feedback }}</p>
          </div>
        </el-popover>
        <span v-else>-</span>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { Assignment } from '@/types'

interface Props {
  assignments: Assignment[]
  loading?: boolean
  showSubmit?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showSubmit: true
})

defineEmits<{
  submit: [assignment: Assignment]
}>()

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

