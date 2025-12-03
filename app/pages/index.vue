<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          DIANAxAKKO Fan Art Gallery
        </h1>
        <p class="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          Explore amazing fan art from our community.
        </p>
      </div>

      <SearchBar v-model="searchQuery" />

      <div v-if="filteredImages.length > 0"
        class="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
        <GalleryCard v-for="image in filteredImages" :key="image.id" :image="image" @click-tag="handleTagClick" />
      </div>

      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          aria-hidden="true">
          <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No images found</h3>
        <p class="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
      </div>
    </div>
  </div>
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
</script>
