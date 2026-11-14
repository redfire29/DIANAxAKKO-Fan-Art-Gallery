<script>
  import { onMount } from "svelte";
  import { galleryImages } from "../data/gallery";
  import {
    getItemKey,
    getThumbnailUrl,
    parseGalleryDate,
  } from "../utils/galleryMedia";
  import { exportYearlySummaryCanvas } from "../utils/yearlyExport";
  import CompareModal from "./CompareModal.svelte";
  import Lightbox from "./Lightbox.svelte";

  const availableYears = [
    ...new Set(
      galleryImages
        .map((img) => parseGalleryDate(img.date).year)
        .filter(Boolean)
    ),
  ].sort((a, b) => Number(a) - Number(b));

  let selectedYear = $state(
    availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : new Date().getFullYear().toString()
  );
  let userIndices = $state({});
  let imageOffsets = $state({});
  let isSecretUnlocked = $state(false);
  let hasMounted = $state(false);

  // 載入 localStorage 紀錄與檢查秘密模式參數
  onMount(() => {
    const saved = localStorage.getItem("yearly-gallery-indices");
    if (saved) {
      try {
        userIndices = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved indices", e);
      }
    }

    const savedOffsets = localStorage.getItem("yearly-image-offsets");
    if (savedOffsets) {
      try {
        imageOffsets = JSON.parse(savedOffsets);
      } catch (e) {
        console.error("Failed to parse saved offsets", e);
      }
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pint") === "0701" || params.get("print") === "0701") {
        isSecretUnlocked = true;
      }
    }

    hasMounted = true;
  });

  $effect(() => {
    if (!hasMounted || typeof localStorage === "undefined") return;
    localStorage.setItem("yearly-gallery-indices", JSON.stringify(userIndices));
  });

  $effect(() => {
    if (!hasMounted || typeof localStorage === "undefined") return;
    localStorage.setItem("yearly-image-offsets", JSON.stringify(imageOffsets));
  });

  // --- 圖片位置微調 ---
  let isRepositionMode = $state(false);
  let activeDrag = $state(null);

  const getImageOffset = (month, year = selectedYear) => {
    const key = `${year}-${month}`;
    return imageOffsets[key] || { x: 50, y: 50 };
  };

  const updateImageOffset = (month, year, x, y) => {
    const key = `${year}-${month}`;
    const clampedX = Math.max(0, Math.min(100, Math.round(x)));
    const clampedY = Math.max(0, Math.min(100, Math.round(y)));
    imageOffsets = {
      ...imageOffsets,
      [key]: { x: clampedX, y: clampedY },
    };
  };

  const resetImageOffset = (month, year = selectedYear) => {
    const key = `${year}-${month}`;
    const updated = { ...imageOffsets };
    delete updated[key];
    imageOffsets = updated;
  };

  const handleDragStart = (e, month) => {
    if (!isRepositionMode) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const current = getImageOffset(month, selectedYear);
    const rect = e.currentTarget.getBoundingClientRect();
    activeDrag = {
      month,
      startX: clientX,
      startY: clientY,
      initialX: current.x,
      initialY: current.y,
      width: rect.width || 300,
      height: rect.height || 300,
    };
  };

  const handleDragMove = (e) => {
    if (!activeDrag) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const deltaX = clientX - activeDrag.startX;
    const deltaY = clientY - activeDrag.startY;
    // 反向直覺拖曳：滑鼠往下拉，想要看到上方內容（Y 變小）
    const percentX = activeDrag.initialX - (deltaX / activeDrag.width) * 100;
    const percentY = activeDrag.initialY - (deltaY / activeDrag.height) * 100;

    updateImageOffset(activeDrag.month, selectedYear, percentX, percentY);
  };

  const handleDragEnd = () => {
    activeDrag = null;
  };

  // --- 年度與月份作品資料 ---
  let yearlyTotalCount = $derived(
    galleryImages.filter((img) => parseGalleryDate(img.date).year === selectedYear).length
  );

  const getMonthData = (month, year = selectedYear) => {
    return galleryImages
      .filter((img) => {
        const parsed = parseGalleryDate(img.date);
        return parsed.year === year && parsed.month === month;
      })
      .reverse();
  };

  const getMonthItem = (month, year = selectedYear, indices = userIndices) => {
    const data = getMonthData(month, year);
    if (data.length === 0) return null;
    const key = `${year}-${month}`;
    const index = indices[key] || 0;
    return data[index % data.length];
  };

  const getMonthThumbnail = (month, year = selectedYear, indices = userIndices) => {
    const item = getMonthItem(month, year, indices);
    return item ? getThumbnailUrl(item) : null;
  };

  const getUserIndex = (month, year = selectedYear, indices = userIndices) => {
    const data = getMonthData(month, year);
    if (data.length === 0) return 0;
    const key = `${year}-${month}`;
    return ((indices[key] || 0) % data.length) + 1;
  };

  const stepMonthIndex = (month, delta) => {
    const count = getMonthData(month, selectedYear).length;
    if (count <= 1) return;
    const key = `${selectedYear}-${month}`;
    const currentIndex = userIndices[key] || 0;
    userIndices = {
      ...userIndices,
      [key]: (currentIndex + delta + count) % count,
    };
  };

  // --- 媒體載入狀態追蹤（避免快取／切換同月圖片時卡在 loading） ---
  let imageLoadStatus = $state({});

  const checkCachedMedia = (node, loadKey) => {
    const check = (currentKey) => {
      if (node.tagName === "VIDEO") {
        if (node.readyState >= 2) imageLoadStatus[currentKey] = true;
      } else if (node.complete && node.naturalWidth > 0) {
        imageLoadStatus[currentKey] = true;
      }
    };
    check(loadKey);
    return {
      update(newKey) {
        check(newKey);
      },
    };
  };

  // --- 秘密功能：匯出年度回顧 & 跨年份對比 ---
  let isExportingSummary = $state(false);
  let exportSummaryProgress = $state("");
  let isCompareModalOpen = $state(false);

  const exportYearlySummary = async () => {
    if (isExportingSummary) return;
    isExportingSummary = true;
    exportSummaryProgress = "建立畫布中...";

    try {
      await exportYearlySummaryCanvas({
        selectedYear,
        getMonthThumbnail: (m, y) => getMonthThumbnail(m, y, userIndices),
        getImageOffset,
        onProgress: (msg) => {
          exportSummaryProgress = msg;
        },
      });
    } catch (e) {
      console.error("導出年度回顧失敗", e);
      alert("導出年度回顧圖失敗，請檢查網路連線或稍後再試！");
    } finally {
      isExportingSummary = false;
      exportSummaryProgress = "";
    }
  };

  // --- 燈箱控制 ---
  let isModalOpen = $state(false);
  let selectedModalImageIndex = $state(0);
  let modalImages = $state([]);

  const openModalForMonth = (month) => {
    const data = getMonthData(month, selectedYear);
    if (data.length === 0) return;

    modalImages = data;
    const key = `${selectedYear}-${month}`;
    const currentIdx = userIndices[key] || 0;
    selectedModalImageIndex = currentIdx % data.length;
    isModalOpen = true;
  };
</script>

<svelte:window
  onmousemove={handleDragMove}
  onmouseup={handleDragEnd}
  ontouchmove={handleDragMove}
  ontouchend={handleDragEnd}
/>

<div class="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto 2xl:max-w-[1920px]">
    <div class="text-center mb-6">
      <div class="mb-6 flex justify-center gap-4 flex-wrap items-center">
        {#each availableYears as year (year)}
          <button
            type="button"
            onclick={() => (selectedYear = year)}
            class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors cursor-pointer {selectedYear === year
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 hover:bg-gray-50'}"
          >
            {year}
          </button>
        {/each}

        {#if isSecretUnlocked}
          <button
            type="button"
            onclick={() => (isRepositionMode = !isRepositionMode)}
            class="px-4 py-2 rounded-md text-sm font-medium border transition-colors flex items-center gap-2 cursor-pointer {isRepositionMode
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}"
          >
            {#if isRepositionMode}
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>完成微調</span>
            {:else}
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              <span>微調圖片位置</span>
            {/if}
          </button>

          <button
            type="button"
            onclick={exportYearlySummary}
            disabled={isExportingSummary}
            class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {#if isExportingSummary}
              <svg class="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{exportSummaryProgress || "導出中..."}</span>
            {:else}
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>匯出 {selectedYear} 年度回顧</span>
            {/if}
          </button>

          <button
            type="button"
            onclick={() => (isCompareModalOpen = true)}
            class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <span>雙年份比對</span>
          </button>
        {/if}
      </div>

      <h1 class="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
        {selectedYear} 年度表
      </h1>
      <p class="mt-2 text-sm font-medium text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full">
        今年總計：{yearlyTotalCount} 張作品
      </p>
    </div>

    {#if isRepositionMode}
      <div class="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div class="flex items-center gap-2.5">
          <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            <strong>微調模式已開啟</strong>：直接在下方各月份圖片上<strong>按住滑鼠拖曳</strong>即可調整上下/左右裁切位置，畫面將即時反映並自動保存，輸出年度回顧時會精確採用此視角。
          </span>
        </div>
        <button
          type="button"
          onclick={() => (isRepositionMode = false)}
          class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer shadow-sm transition-colors"
        >
          完成微調
        </button>
      </div>
    {/if}

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {#each Array(12) as _, i (i)}
        {@const month = i + 1}
        {@const monthData = getMonthData(month, selectedYear)}
        {@const monthCount = monthData.length}
        {@const currentItem = getMonthItem(month, selectedYear, userIndices)}
        {@const thumbUrl = currentItem ? getThumbnailUrl(currentItem) : null}
        {@const loadKey = currentItem ? `${selectedYear}-${month}-${getItemKey(currentItem)}` : ""}
        {@const offset = getImageOffset(month, selectedYear)}

        <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 group flex flex-col">
          <!-- 月份標頭 -->
          <div class="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="font-bold text-gray-900">{month} 月</span>
              {#if isRepositionMode && monthCount > 0}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    resetImageOffset(month, selectedYear);
                  }}
                  title="重設裁切位置為置中"
                  class="text-[11px] text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 font-medium cursor-pointer transition-colors"
                >
                  重設
                </button>
              {/if}
            </div>
            {#if monthCount > 0}
              <span class="text-xs text-gray-400 font-medium">
                {getUserIndex(month, selectedYear, userIndices)} / {monthCount}
              </span>
            {/if}
          </div>

          <!-- 圖片容器 -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="aspect-square relative overflow-hidden bg-gray-100 group/img border-t border-gray-100/50 {isRepositionMode ? 'cursor-grab active:cursor-grabbing select-none' : ''}"
            onmousedown={(e) => handleDragStart(e, month)}
            ontouchstart={(e) => handleDragStart(e, month)}
          >
            {#if currentItem && thumbUrl}
              {#if !imageLoadStatus[loadKey]}
                <div class="absolute inset-0 bg-gray-200 animate-pulse z-0 pointer-events-none"></div>
              {/if}

              <button
                type="button"
                class="block w-full h-full relative text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 {isRepositionMode ? 'pointer-events-none' : 'cursor-pointer'}"
                onclick={() => {
                  if (!isRepositionMode) openModalForMonth(month);
                }}
                aria-label={`檢視 ${selectedYear} 年 ${month} 月作品`}
              >
                {#if currentItem.type === "video"}
                  <!-- svelte-ignore a11y_media_has_caption -->
                  <video
                    use:checkCachedMedia={loadKey}
                    src={thumbUrl}
                    class="w-full h-full object-cover transition-transform duration-300 relative z-10 {imageLoadStatus[loadKey] ? 'opacity-100' : 'opacity-0'} {isRepositionMode ? '' : 'group-hover/img:scale-105'}"
                    style="object-position: {offset.x}% {offset.y}%;"
                    autoplay
                    loop
                    muted
                    playsinline
                    onloadeddata={() => (imageLoadStatus[loadKey] = true)}
                  ></video>
                {:else}
                  <img
                    use:checkCachedMedia={loadKey}
                    src={thumbUrl}
                    alt={`${selectedYear} 年 ${month} 月作品`}
                    class="w-full h-full object-cover transition-transform duration-300 relative z-10 {imageLoadStatus[loadKey] ? 'opacity-100' : 'opacity-0'} {isRepositionMode ? '' : 'group-hover/img:scale-105'}"
                    style="object-position: {offset.x}% {offset.y}%;"
                    loading="lazy"
                    onload={() => (imageLoadStatus[loadKey] = true)}
                    onerror={() => (imageLoadStatus[loadKey] = true)}
                  />
                {/if}

                {#if currentItem.type === "youtube"}
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div class="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover/img:bg-red-600 transition-colors shadow-lg">
                      <svg class="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                {/if}
              </button>

              {#if monthCount > 1}
                <button
                  type="button"
                  class="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 focus:opacity-100 cursor-pointer z-20 border border-white/10"
                  onclick={(e) => {
                    e.stopPropagation();
                    stepMonthIndex(month, -1);
                  }}
                  aria-label={`${month} 月上一張作品`}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 focus:opacity-100 cursor-pointer z-20 border border-white/10"
                  onclick={(e) => {
                    e.stopPropagation();
                    stepMonthIndex(month, 1);
                  }}
                  aria-label={`${month} 月下一張作品`}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              {/if}
            {:else}
              <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-4">
                <svg class="w-10 h-10 text-gray-300/80 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span class="text-xs font-semibold text-gray-400 italic">No Art</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<Lightbox
  isOpen={isModalOpen}
  items={modalImages}
  bind:currentIndex={selectedModalImageIndex}
  onClose={() => (isModalOpen = false)}
/>

<CompareModal
  isOpen={isCompareModalOpen}
  {availableYears}
  initialYear={selectedYear}
  onClose={() => (isCompareModalOpen = false)}
/>
