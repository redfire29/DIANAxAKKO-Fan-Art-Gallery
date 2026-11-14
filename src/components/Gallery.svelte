<script>
  import { fade, fly } from "svelte/transition";
  import { galleryImages } from "../data/gallery";
  import { getItemKey, parseGalleryDate } from "../utils/galleryMedia";
  import GalleryCard from "./GalleryCard.svelte";
  import Lightbox from "./Lightbox.svelte";

  let selectedTags = $state([]);
  let selectedYear = $state("全部年份");
  let scrollY = $state(0);
  // 預設以桌機 5 欄作為 SSR 基準，掛載後透過 bind:innerWidth 即時同步視窗寬度
  let innerWidth = $state(1280);

  let isModalOpen = $state(false);
  let selectedIndex = $state(0);

  let columnCount = $derived.by(() => {
    if (innerWidth >= 1280) return 5;
    if (innerWidth >= 1024) return 3;
    if (innerWidth >= 640) return 2;
    return 1;
  });

  const availableYears = [
    ...new Set(
      galleryImages
        .map((img) => parseGalleryDate(img.date).year)
        .filter(Boolean)
    ),
  ].sort((a, b) => Number(b) - Number(a));

  let filteredImages = $derived(
    galleryImages.filter((image) => {
      if (
        selectedYear !== "全部年份" &&
        parseGalleryDate(image.date).year !== selectedYear
      ) {
        return false;
      }

      if (selectedTags.length > 0) {
        const hasAnyTag = selectedTags.some((tag) =>
          image.hashtags.some(
            (imgTag) => imgTag.toLowerCase() === tag.toLowerCase()
          )
        );
        if (!hasAnyTag) {
          return false;
        }
      }

      return true;
    })
  );

  // 依序橫向輪流分配至各欄，確保由左至右、由上至下符合時間順序
  let columns = $derived.by(() => {
    const cols = Array.from({ length: columnCount }, () => []);
    filteredImages.forEach((image, index) => {
      cols[index % columnCount].push(image);
    });
    return cols;
  });

  let hashtags = $derived(
    (() => {
      const yearImages = galleryImages.filter((image) => {
        return (
          selectedYear === "全部年份" ||
          parseGalleryDate(image.date).year === selectedYear
        );
      });
      const tagCounts = {};
      yearImages.forEach((image) => {
        image.hashtags.forEach((tag) => {
          if (!/^\d+$/.test(tag)) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      });
      return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
    })()
  );

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter((t) => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  };

  // 點擊卡片上的純數字年份標籤改為切換年份下拉選單
  const handleCardTagClick = (tag) => {
    if (/^\d{4}$/.test(tag) && availableYears.includes(tag)) {
      selectedYear = selectedYear === tag ? "全部年份" : tag;
      return;
    }
    toggleTag(tag);
  };

  const resetFilters = () => {
    selectedYear = "全部年份";
    selectedTags = [];
  };

  const openModal = (image) => {
    const key = getItemKey(image);
    const idx = filteredImages.findIndex((img) => getItemKey(img) === key);
    selectedIndex = idx >= 0 ? idx : 0;
    isModalOpen = true;
  };

  const closeModal = () => {
    isModalOpen = false;
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
</script>

<svelte:window bind:scrollY bind:innerWidth />

<div class="pb-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto 2xl:max-w-[1920px]">
    <!-- 篩選控制列 -->
    <div class="mb-8 py-4 border-b border-gray-200/40">
      <div class="mx-auto">
        <div class="flex flex-wrap gap-4 mb-4">
          <div class="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <label
              for="year-select"
              aria-label="篩選年份"
              class="text-sm font-semibold text-gray-600 flex items-center gap-1.5"
            >
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
            </label>
            <select
              id="year-select"
              bind:value={selectedYear}
              class="bg-transparent border-none text-sm font-bold text-gray-800 focus:ring-0 cursor-pointer pr-2"
            >
              <option value="全部年份">全部年份</option>
              {#each availableYears as year (year)}
                <option value={year}>{year}</option>
              {/each}
            </select>
          </div>

          <div class="flex-1 min-w-[100px] md:min-w-[200px] flex items-center gap-2 flex-wrap">
            {#if selectedTags.length === 0}
              <span class="text-sm text-gray-400">請選擇下方標籤進行篩選</span>
            {:else}
              {#each selectedTags as tag (tag)}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  #{tag}
                  <button
                    type="button"
                    class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    onclick={() => toggleTag(tag)}
                    aria-label={`移除標籤 ${tag}`}
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </button>
                </span>
              {/each}
            {/if}
          </div>

          {#if selectedYear !== "全部年份" || selectedTags.length > 0}
            <button
              type="button"
              onclick={resetFilters}
              title="清除所有篩選"
              aria-label="清除所有篩選"
              class="p-2.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-sm"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          {/if}
        </div>

        <ul class="flex flex-wrap gap-2 mt-2 border-t border-gray-100/80 pt-3 md:pt-4">
          {#each hashtags as tag (tag)}
            <li>
              <button
                type="button"
                onclick={() => toggleTag(tag)}
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 {selectedTags.includes(tag) ? 'bg-blue-600 text-white shadow-sm scale-105' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}"
              >
                #{tag}
                {#if selectedTags.includes(tag)}
                  <span class="ml-1.5 text-[10px] opacity-80">✕</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <!-- 作品瀑布流（橫向時間順序分欄 Masonry） -->
    {#if filteredImages.length > 0}
      <div class="flex gap-6 items-start">
        {#each columns as col, colIdx (colIdx)}
          <div class="flex-1 min-w-0 flex flex-col gap-6">
            {#each col as image (getItemKey(image))}
              <GalleryCard
                {image}
                onTagClick={handleCardTagClick}
                onImageClick={openModal}
              />
            {/each}
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-16">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <p class="mt-3 text-sm font-medium text-gray-500">
          找不到符合目前篩選條件的作品
        </p>
        <button
          type="button"
          onclick={resetFilters}
          class="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
        >
          清除所有篩選
        </button>
      </div>
    {/if}
  </div>
</div>

{#if scrollY > 500}
  <button
    type="button"
    class="fixed bottom-6 right-6 md:bottom-8 md:right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-300 z-40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center group cursor-pointer"
    onclick={scrollToTop}
    in:fly={{ y: 20, duration: 300 }}
    out:fade={{ duration: 200 }}
    aria-label="回到頂部"
  >
    <svg class="w-6 h-6 transform group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
    </svg>
  </button>
{/if}

<Lightbox
  isOpen={isModalOpen}
  items={filteredImages}
  bind:currentIndex={selectedIndex}
  onClose={closeModal}
/>
