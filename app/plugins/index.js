import { defineNuxtPlugin } from '#app'
import { useStore } from '~/stores/index'

export default defineNuxtPlugin(async (nuxtApp) => {
  const todos = useStore(nuxtApp.$pinia)
  await todos.getCategories()
})
