<template lang="pug">
div(
  class="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform"
)
  div(class="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 xl:aspect-w-7 xl:aspect-h-8")
    img(
      :src="image.url",
      :alt="image.hashtags.join(', ')",
      loading="lazy",
      class="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity duration-300"
    )
  div(class="p-4")
    div(class="flex flex-wrap gap-2 mb-3")
      button(
        v-for="tag in image.hashtags",
        :key="tag",
        @click="$emit('click-tag', tag)",
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors duration-200"
      ) \#{{ tag }}
    a(
      :href="image.link",
      target="_blank",
      rel="noopener noreferrer",
      class="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
    ) Twitter(X) Link
      svg(
        class="w-4 h-4 ml-2 -mr-1",
        fill="none",
        stroke="currentColor",
        viewBox="0 0 24 24",
        xmlns="http://www.w3.org/2000/svg"
      )
        path(
          stroke-linecap="round",
          stroke-linejoin="round",
          stroke-width="2",
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        )
</template>

<script setup>
defineProps({
  image: {
    type: Object,
    required: true
  }
})
defineEmits(['click-tag'])
</script>
