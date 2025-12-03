import { defineStore } from "pinia";

export const useStore = defineStore('mainStore', {
  state: () => ({
    categories: [],
    pageData: {},
    aboutData: {},
    menuDesc: [],
    navBar: false,
    tagList: [],
    servicePage: [],
    firstInPage: true,
    category: '',
    sub: '',
    topic: '',
    searchQuery: '',
  }),
  getters: {
  },
  actions: {
    tfImg(tf, url) {
      if (!this.imgAnimate) {
        this.openImg = tf;
        this.imgAnimate = true;
        setTimeout(() => {
          this.showImg = url;
          this.imgAnimate = false;
        }, 200)
      }
    },
    tfVideo(tf, videoId) {
      this.videoId = videoId;
      if (!this.videoAnimate) {
        this.videoAnimate = true;
        this.openVideo = tf;
        setTimeout(() => {
          this.showVideo = tf;
          this.videoAnimate = false;
        }, 200)
      }
    },
    setBasicData(data) {
      const obj = {
        webTitle: useGet(data, 'title'),
        webDesc: useGet(data, 'desc'),
        webKeyWord: useGet(data, 'keyword'),
      };

      this.$patch({
        basicData: {
          webTitle: useGet(data, 'title'),
          webDesc: useGet(data, 'desc'),
          webKeyWord: useGet(data, 'keyword'),
        },
      })
    },
    setCategoriesData(data) {
      const safeParseStrict = (str) => {
        try {
          return JSON.parse(str);
        } catch (e) {
          return str;
        }
      }

      const productMenus = useGet(useFind(data, { desc: '書籍分類' }), 'children');
      const menus = useGet(useFind(data, { desc: '選單' }), 'children');

      const plusDeep = (childrenList) => {
        ((children) => {
          if (children) {
            useForEach(children, (value) => {
              const menuPhoneActive = {
                active: false,
              }
              useSet(value, 'phoneActive', menuPhoneActive);
              if (useGet(value, 'plus')) {
                useSet(value, 'plusData', safeParseStrict(value.plus));
              }
              if (value.children) {
                plusDeep(value.children);
              }
            })
          }
        })(childrenList)
      }
      plusDeep(productMenus);
      plusDeep(menus);

      this.$patch({
        categories: data,
        menuData: menus,
      })
    },
    async getCategories() {
      this.$patch({
      })
    },
    setSearchQuery(query) {
      this.searchQuery = query;
    }
  }
})
