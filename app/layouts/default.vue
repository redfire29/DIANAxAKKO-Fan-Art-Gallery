<template lang="pug">
div(
  class="flex flex-col h-full",
)
  header(class="bg-white shadow-sm sticky top-0 z-20")
    nav(class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between")
      div(class="flex items-center gap-8")
        div(class="flex gap-4")
          NuxtLink(to="/" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors" active-class="text-blue-600") 首頁
          NuxtLink(to="/yearly" class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors" active-class="text-blue-600") 年度表
  div(
    class="flex-1"
  )
    div(
      class="w-full mx-auto"
    )
      slot
</template>

<script setup>
</script>
