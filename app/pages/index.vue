<template lang="pug">
div(class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8")
  div(class="max-w-7xl mx-auto 2xl:max-w-[1920px]")
    div(class="text-center mb-12")
      h1(class="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight lg:text-5xl") DIANAxAKKO Fan Art Gallery
      p(class="mt-5 max-w-4xl mx-auto text-base text-gray-500") 由於推特（Ｘ）的 HashTag 一直都沒修好, 導致查詢時會遺漏, 所以做了一個連結自己畫的粉絲圖的網站...
      p(class="mt-5 max-w-4xl mx-auto text-base text-gray-500") Twitter（X）のハッシュタグがずっと直らなくて、検索するとどうしても抜け漏れが出ちゃうので、自分の描いたファンアートをまとめて見られるサイトを作りました……
    div(
      class="sticky top-0 bg-gray-50 z-10 mb-8 py-4"
    )
      div(
        class="mx-auto px-4"
      )
        SearchBar(v-model="searchQuery")
        ul(
          class="flex flex-wrap gap-2 mt-2"
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

const filteredImages = computed(() => {
  if (!searchQuery.value) {
    return galleryImages;
  }
  const query = searchQuery.value.toLowerCase();
  return galleryImages.filter(image =>
    image.hashtags.some(tag => tag.toLowerCase().includes(query))
  );
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
