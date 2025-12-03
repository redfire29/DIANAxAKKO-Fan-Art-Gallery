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
  titleTemplate: `%s - ${useGet(basicData, 'webTitle', '')}`,
  link: [
    { rel: 'canonical', href: computed(() => `${mainStore.$state.pageData.host}${route.fullPath}`) },
  ],
  meta: [
    { hid: 'og:url', property: 'og:url', content: computed(() => `${mainStore.$state.pageData.host}${route.fullPath}`) },
    { hid: 'og:image', property: 'og:image', content: `${useGet(mainStore, '$state.pageData.host')}/og-image.jpg` },
    { hid: 'og:site_name', property: 'og:site_name', content: useGet(basicData, 'webTitle', '') },
  ],
})
</script>
