<template lang="pug">
div(
  class="flex flex-col h-full",
)
  div(
    class="flex-1"
  )
    div(
      class="w-full mx-auto"
    )
      slot
</template>

<script setup>
const mainStore = useStore();
const route = useRoute();
const basicData = useGet(mainStore, '$state.basicData');
useHead({
  title: 'DIANAxAKKO Fan Art Gallery',
  link: [
    { rel: 'canonical', href: computed(() => `${mainStore.$state.pageData.host}${route.fullPath}`) },
  ],
  meta: [
    { hid: 'og:url', property: 'og:url', content: computed(() => `${route.fullPath}`) },
    { hid: 'og:image', property: 'og:image', content: './og-image.jpg' },
    { hid: 'og:site_name', property: 'og:site_name', content: 'DIANAxAKKO Fan Art Gallery' },
  ],
})
</script>
