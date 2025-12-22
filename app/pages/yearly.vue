<template lang="pug">
div(class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8")
  div(class="max-w-7xl mx-auto")
    div(class="text-center mb-4")
      div(class="mb-6 flex justify-center gap-4")
        button(
          v-for="year in availableYears"
          :key="year"
          @click="selectedYear = year"
          :class="[selectedYear === year ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50', 'px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors']"
        ) {{ year }}
      h1(class="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl") {{ selectedYear }} 年度表
      p(class="mt-2 text-sm font-medium text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full") 今年總計：{{ yearlyTotalCount }} 張作品

    div(class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6")
      div(
        v-for="month in 12"
        :key="month"
        class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 group flex flex-col"
      )
        //- Month Header
        div(class="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center")
          span(class="font-bold text-gray-900") {{ month }} 月
          span(v-if="getMonthCount(month) > 0" class="text-xs text-gray-400 font-medium") {{ (userIndices[`${selectedYear}-${month}`] || 0) + 1 }} / {{ getMonthCount(month) }}
        
        //- Image Container
        div(
          class="aspect-square relative overflow-hidden bg-gray-100 cursor-pointer group/img"
          @click="cycleImage(month)"
        )
          template(v-if="getMonthThumbnail(month)")
            img(
              :src="getMonthThumbnail(month)"
              class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              loading="lazy"
            )
            //- Hover overlay for cycle hint
            div(v-if="getMonthCount(month) > 1" class="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center")
              div(class="bg-white/90 px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm") 點擊切換
          div(v-else class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50")
            span(class="text-sm italic font-light") No Art
        
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { galleryImages } from '~/data/gallery';

const selectedYear = ref('2025');
const userIndices = ref({});

// Load persisted indices from localStorage
onMounted(() => {
  const saved = localStorage.getItem('yearly-gallery-indices');
  if (saved) {
    try {
      userIndices.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved indices', e);
    }
  }
});

// Update localStorage when indices change
watch(userIndices, (newVal) => {
  localStorage.setItem('yearly-gallery-indices', JSON.stringify(newVal));
}, { deep: true });

const availableYears = [...new Set(galleryImages.map(img => img.date.split('/')[0]))].sort((a, b) => b - a);

const yearlyTotalCount = computed(() => {
  return galleryImages.filter(img => img.date.startsWith(selectedYear.value)).length;
});

const getMonthData = (month) => {
  const monthStr = month.toString().padStart(2, '0');
  // 保持原始順序或根據日期排序 (gallery.js 是最新在前，所以我們 reverse 讓它是最早在前比較直覺)
  return galleryImages
    .filter(img => img.date.startsWith(`${selectedYear.value}/${monthStr}`))
    .reverse();
};

const getMonthCount = (month) => {
  return getMonthData(month).length;
};

const getMonthThumbnail = (month) => {
  const data = getMonthData(month);
  if (data.length === 0) return null;

  const key = `${selectedYear.value}-${month}`;
  const index = userIndices.value[key] || 0;

  // Ensure index is within bounds if data changed
  const safeIndex = index % data.length;
  return data[safeIndex].url;
};

const cycleImage = (month) => {
  const count = getMonthCount(month);
  if (count <= 1) return; const key = `${selectedYear.value}-${month}`; const currentIndex = userIndices.value[key] || 0;
  userIndices.value[key] = (currentIndex + 1) % count;
}; </script>