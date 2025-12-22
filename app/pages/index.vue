<template lang="pug">
div(class="min-h-screen bg-gray-50 py-12 px-2 md:px-4 sm:px-6 lg:px-8")
  div(class="max-w-7xl mx-auto 2xl:max-w-[1920px]")
    div(class="text-center mb-12")
      h1(class="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight lg:text-5xl") DIANAxAKKO Fan Art Gallery
      p(class="mt-5 max-w-4xl mx-auto text-base text-gray-500") 由於推特（Ｘ）的 HashTag 一直都沒修好, 導致查詢時會遺漏, 所以做了一個連結自己畫的粉絲圖的網站...
      p(class="mt-5 max-w-4xl mx-auto text-base text-gray-500") Twitter（X）のハッシュタグがずっと直らなくて、検索するとどうしても抜け漏れが出ちゃうので、自分の描いたファンアートをまとめて見られるサイトを作りました……
      p(class="mt-1 max-w-4xl mx-auto text-[14px] text-blue-500") {{ `Updated: ${galleryImages[0].date}` }}
    div(
      class="sticky top-0 bg-gray-50 z-10 mb-8 py-4"
    )
      div(
        class="mx-auto px-4"
      )
        div(
          class="flex flex-wrap gap-4 mb-4"
        )
          div(class="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm")
            label(for="year-select" class="text-sm font-semibold text-gray-600 flex items-center gap-1.5")
              svg(class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24")
                path(stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z")
            select(
              id="year-select"
              v-model="selectedYear"
              class="bg-transparent border-none text-sm font-bold text-gray-800 focus:ring-0 cursor-pointer pr-2"
            )
              option(value="全部年份") 全部年份
              option(
                v-for="year in availableYears"
                :key="year"
                :value="year"
              ) {{ year }}
          
          div(class="flex-1 min-w-[100px] md:min-w-[200px]")
            SearchBar(v-model="searchQuery")
        
        ul(
          class="flex flex-wrap gap-2 mt-2 border-t border-gray-100 md:pt-4"
        )
          li(
            v-for="tag in hashtags",
          )
            button(
              :key="tag",
              @click="handleTagClick(tag)",
              class="items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors duration-200"
            ) \#{{ tag }}
    div(
      v-if="filteredImages.length > 0",
      class="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-8"
    )
      GalleryCard(
        v-for="image in filteredImages",
        :key="image.date",
        :image="image",
        @click-tag="handleTagClick"
      )
    div(
      v-else,
      class="text-center py-12"
    )
      svg(
        class="mx-auto h-12 w-12 text-gray-400",
        fill="none",
        viewBox="0 0 24 24",
        stroke="currentColor",
        aria-hidden="true"
      )
        path(
          vector-effect="non-scaling-stroke",
          stroke-linecap="round",
          stroke-linejoin="round",
          stroke-width="2",
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        )
</template>

<script setup>
import { galleryImages } from '~/data/gallery';

const searchQuery = ref('');
const selectedYear = ref('全部年份');

const availableYears = computed(() => {
  return [...new Set(galleryImages.map(img => img.date.split('/')[0]))].sort((a, b) => b - a);
});

const filteredImages = computed(() => {
  let filtered = galleryImages;

  // Year filter
  if (selectedYear.value !== '全部年份') {
    filtered = filtered.filter(image => image.date.startsWith(selectedYear.value));
  }

  // Search/Tag filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(image =>
      image.hashtags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
});

const handleTagClick = (tag) => {
  searchQuery.value = tag;
};

const hashtags = [
  'うみコレオ',
  'しゆのアトリエ',
  'あか絵るら',
  '夢栞の展覧会',
  '沐藝工坊',
  'Shinn手拈來',
  '月城様献上品',
]
</script>
