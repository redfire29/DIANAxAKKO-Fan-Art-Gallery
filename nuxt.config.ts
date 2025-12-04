// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/image',
    '@chettapong/nuxt-lodash',
    'nuxt-seo-utils',
  ],
  app: {
    baseURL: '/DIANAxAKKO-Fan-Art-Gallery/',
    head: {
      htmlAttrs: {
        lang: 'zh-Hant',
      },
      meta: [
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'apple-mobile-web-app-title', content: '', },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96', },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg', },
        { rel: 'shortcut icon', href: '/favicon.ico', },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png', },
        { rel: 'manifest', href: '/site.webmanifest', },
      ],
      script: [],
    }
  },
  tailwindcss: {
    cssPath: [
      '~/assets/css/main.css',
      {
        injectPosition: 'last'
      },
    ],
  },
  image: {
    format: ['auto'],
    densities: [1, 2],
  },
})
