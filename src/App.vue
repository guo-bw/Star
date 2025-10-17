<template>
  <router-view />
</template>

<script setup lang="ts">
// 认证状态初始化已移至路由守卫中处理
// 确保在路由导航前完成初始化，避免刷新时被踢回登录页
</script>

<style>
#app {
  height: 100vh;
  overflow: hidden;
}
</style>

