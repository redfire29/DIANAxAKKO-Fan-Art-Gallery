<script>
  import { fade, fly } from "svelte/transition";
  import {
    getLargeMediaUrl,
    getSourceLabel,
    getSourceLink,
  } from "../utils/galleryMedia";

  /**
   * 共用作品大圖燈箱，支援圖片、影片、YouTube Shorts、鍵盤導覽與觸控滑動
   */
  let {
    isOpen = false,
    items = [],
    currentIndex = $bindable(0),
    onClose = () => {},
  } = $props();

  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchEndX = $state(0);
  let touchEndY = $state(0);

  let currentItem = $derived(items[currentIndex] || null);
  let hasMultiple = $derived(items.length > 1);

  // 鎖定燈箱開啟時的頁面捲動，並在關閉或卸載時自動恢復
  $effect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  });

  const nextImage = () => {
    if (!hasMultiple) return;
    currentIndex = (currentIndex + 1) % items.length;
  };

  const prevImage = () => {
    if (!hasMultiple) return;
    currentIndex = (currentIndex - 1 + items.length) % items.length;
  };

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 50) {
        prevImage();
      } else if (diffX < -50) {
        nextImage();
      }
    } else if (diffY > 100) {
      onClose();
    }
  };

  const handleKeydown = (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowRight") nextImage();
    if (event.key === "ArrowLeft") prevImage();
  };

  const openYoutube = (item) => {
    const url = getSourceLink(item);
    if (url && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentItem}
  <div
    role="dialog"
    aria-modal="true"
    aria-label="作品大圖檢視"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all select-none"
    transition:fade={{ duration: 200 }}
    onclick={onClose}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <!-- 關閉按鈕 -->
    <button
      type="button"
      aria-label="關閉檢視"
      class="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-[60] cursor-pointer"
      onclick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!-- 左右切換按鈕 -->
    {#if hasMultiple}
      <button
        type="button"
        aria-label="上一張作品"
        class="absolute left-4 md:left-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60] cursor-pointer"
        onclick={(e) => {
          e.stopPropagation();
          prevImage();
        }}
      >
        <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="下一張作品"
        class="absolute right-4 md:right-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60] cursor-pointer"
        onclick={(e) => {
          e.stopPropagation();
          nextImage();
        }}
      >
        <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    {/if}

    <!-- 主內容區 -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
      onclick={(e) => e.stopPropagation()}
    >
      {#key currentIndex}
        <div
          class="relative"
          in:fly={{ y: 20, duration: 300, delay: 100 }}
          out:fade={{ duration: 200 }}
        >
          <div class="relative">
            {#if hasMultiple && currentItem.type !== "youtube"}
              <button
                type="button"
                class="absolute inset-y-0 left-0 w-1/2 z-20 cursor-pointer bg-transparent"
                onclick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="上一張作品"
              ></button>
              <button
                type="button"
                class="absolute inset-y-0 right-0 w-1/2 z-20 cursor-pointer bg-transparent"
                onclick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="下一張作品"
              ></button>
            {/if}

            {#if currentItem.type === "youtube"}
              <div class="relative w-full max-w-2xl h-[70vh] sm:h-[80vh] flex items-center justify-center bg-black/50 rounded-lg shadow-2xl z-10 overflow-hidden">
                <img
                  src={getLargeMediaUrl(currentItem)}
                  alt={`${currentItem.date} YouTube Shorts 預覽`}
                  class="max-w-full max-h-full object-contain opacity-75"
                />
                <div class="absolute inset-0 flex items-center justify-center z-30">
                  <button
                    type="button"
                    class="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                    onclick={(e) => {
                      e.stopPropagation();
                      openYoutube(currentItem);
                    }}
                    aria-label="前往 YouTube Shorts 觀看"
                  >
                    <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            {:else if currentItem.type === "video"}
              <!-- svelte-ignore a11y_media_has_caption -->
              <video
                src={getLargeMediaUrl(currentItem)}
                class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl relative z-10"
                autoplay
                loop
                muted
                playsinline
              ></video>
            {:else}
              <img
                src={getLargeMediaUrl(currentItem)}
                alt={`${currentItem.date} 作品大圖`}
                class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl relative z-10"
              />
            {/if}
          </div>

          <!-- 作品資訊與外部連結 -->
          <div class="mt-4 text-center text-white relative z-30">
            <div class="flex items-center justify-center gap-4 mb-2">
              <span class="font-medium text-lg">{currentItem.date}</span>
              {#if getSourceLink(currentItem)}
                <a
                  href={getSourceLink(currentItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
                >
                  {getSourceLabel(currentItem)}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              {/if}
            </div>

            <div class="flex flex-wrap justify-center gap-2">
              {#each currentItem.hashtags as tag (tag)}
                <span class="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs">
                  #{tag}
                </span>
              {/each}
            </div>

            {#if hasMultiple}
              <p class="text-white/40 text-xs mt-4">
                {currentIndex + 1} / {items.length}
              </p>
            {/if}
          </div>
        </div>
      {/key}
    </div>
  </div>
{/if}

