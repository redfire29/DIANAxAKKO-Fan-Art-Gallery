<script>
  import { fade } from "svelte/transition";
  import { galleryImages } from "../data/gallery";
  import {
    getItemKey,
    getLargeMediaUrl,
    getThumbnailUrl,
    parseGalleryDate,
  } from "../utils/galleryMedia";
  import { exportCompareImageCanvas } from "../utils/yearlyExport";

  /**
   * 跨年份作品對比彈窗，支援挑選兩組年份／月份／作品並匯出高畫質對比圖
   */
  let {
    isOpen = false,
    availableYears = [],
    initialYear = "",
    onClose = () => {},
  } = $props();

  let compareYearA = $state("");
  let compareYearB = $state("");
  let compareMonthA = $state(null);
  let compareMonthB = $state(null);
  let compareImageA = $state(null);
  let compareImageB = $state(null);
  let isExportingCompare = $state(false);

  const getAvailableMonthsForYear = (year) => {
    const monthCounts = {};
    galleryImages
      .filter((img) => parseGalleryDate(img.date).year === year)
      .forEach((img) => {
        const { month } = parseGalleryDate(img.date);
        if (month > 0) {
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      });
    return Object.keys(monthCounts)
      .map((m) => parseInt(m, 10))
      .sort((a, b) => a - b)
      .map((m) => ({ month: m, count: monthCounts[m] }));
  };

  const getImagesForYearMonth = (year, month) => {
    if (!month) return [];
    return galleryImages
      .filter((img) => {
        const parsed = parseGalleryDate(img.date);
        return parsed.year === year && parsed.month === month;
      })
      .reverse();
  };

  // 每次開啟彈窗時初始化左右預設年份與首末月作品
  $effect(() => {
    if (!isOpen) return;

    const firstYear = availableYears[0] || initialYear;
    const lastYear = availableYears[availableYears.length - 1] || initialYear;
    compareYearA = firstYear;
    compareYearB = lastYear;

    const monthsA = getAvailableMonthsForYear(firstYear);
    if (monthsA.length > 0) {
      compareMonthA = monthsA[0].month;
      const imgsA = getImagesForYearMonth(firstYear, compareMonthA);
      compareImageA = imgsA[0] || null;
    } else {
      compareMonthA = null;
      compareImageA = null;
    }

    const monthsB = getAvailableMonthsForYear(lastYear);
    if (monthsB.length > 0) {
      compareMonthB = monthsB[monthsB.length - 1].month;
      const imgsB = getImagesForYearMonth(lastYear, compareMonthB);
      compareImageB = imgsB[0] || null;
    } else {
      compareMonthB = null;
      compareImageB = null;
    }
  });

  // 開啟期間鎖定頁面捲動
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

  let availableMonthsA = $derived(getAvailableMonthsForYear(compareYearA));
  let availableMonthsB = $derived(getAvailableMonthsForYear(compareYearB));
  let imagesForSelectionA = $derived(getImagesForYearMonth(compareYearA, compareMonthA));
  let imagesForSelectionB = $derived(getImagesForYearMonth(compareYearB, compareMonthB));

  const handleYearChange = (side, newYear) => {
    const months = getAvailableMonthsForYear(newYear);
    const targetMonth =
      months.length > 0
        ? side === "A"
          ? months[0].month
          : months[months.length - 1].month
        : null;
    const images = targetMonth ? getImagesForYearMonth(newYear, targetMonth) : [];
    const targetImage = images[0] || null;

    if (side === "A") {
      compareYearA = newYear;
      compareMonthA = targetMonth;
      compareImageA = targetImage;
    } else {
      compareYearB = newYear;
      compareMonthB = targetMonth;
      compareImageB = targetImage;
    }
  };

  const handleMonthChange = (side, month) => {
    if (side === "A") {
      compareMonthA = month;
      const images = getImagesForYearMonth(compareYearA, month);
      compareImageA = images[0] || null;
    } else {
      compareMonthB = month;
      const images = getImagesForYearMonth(compareYearB, month);
      compareImageB = images[0] || null;
    }
  };

  const handleExport = async () => {
    if (!compareImageA || !compareImageB || isExportingCompare) return;
    isExportingCompare = true;
    try {
      await exportCompareImageCanvas({
        imageA: compareImageA,
        imageB: compareImageB,
        yearA: compareYearA,
        monthA: compareMonthA,
        yearB: compareYearB,
        monthB: compareMonthB,
      });
    } catch (err) {
      console.error("導出對比圖失敗", err);
      alert("導出對比圖失敗，請檢查圖片載入或稍後再試！");
    } finally {
      isExportingCompare = false;
    }
  };

  const handleKeydown = (e) => {
    if (isOpen && e.key === "Escape") {
      onClose();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet comparePanel(side, title, selectedYear, availableMonths, selectedMonth, images, selectedImage, onSelectImage)}
  {@const isA = side === "A"}
  <div class="flex flex-col gap-3.5 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
    <div class="flex items-center justify-between border-b border-gray-100 pb-2.5">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full {isA ? 'bg-blue-600' : 'bg-indigo-600'}"></span>
        <span class="text-sm font-bold text-gray-800">{title}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 font-medium">年份：</span>
        <select
          value={selectedYear}
          onchange={(e) => handleYearChange(side, e.currentTarget.value)}
          aria-label={`${title}年份選擇`}
          class="bg-gray-50 text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:outline-none cursor-pointer {isA ? 'focus:ring-blue-500' : 'focus:ring-indigo-500'}"
        >
          {#each availableYears as year (year)}
            <option value={year}>{year} 年</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <div class="text-xs font-semibold text-gray-600 flex justify-between">
        <span>選擇有作品的月份：</span>
        <span class="text-gray-400">點擊切換月份作品</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#if availableMonths.length === 0}
          <span class="text-xs text-gray-400 py-1">該年份無收錄作品</span>
        {:else}
          {#each availableMonths as mObj (mObj.month)}
            <button
              type="button"
              onclick={() => handleMonthChange(side, mObj.month)}
              class="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer {selectedMonth === mObj.month ? (isA ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm') : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}"
            >
              {mObj.month} 月 ({mObj.count})
            </button>
          {/each}
        {/if}
      </div>
    </div>

    {#if selectedMonth}
      <div class="flex flex-col gap-1.5">
        <div class="text-xs font-semibold text-gray-600 flex justify-between">
          <span>{selectedYear} 年 {selectedMonth} 月作品：</span>
          <span class="text-gray-400">共 {images.length} 張</span>
        </div>
        <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
          {#each images as img (getItemKey(img))}
            <button
              type="button"
              onclick={() => onSelectImage(img)}
              aria-label={`選擇 ${img.date} 作品`}
              class="aspect-square rounded-md overflow-hidden border-2 transition-all relative cursor-pointer {selectedImage === img ? (isA ? 'border-blue-600 ring-2 ring-blue-100 scale-95' : 'border-indigo-600 ring-2 ring-indigo-100 scale-95') : 'border-transparent opacity-75 hover:opacity-100 hover:border-gray-300'}"
            >
              <img
                src={getThumbnailUrl(img)}
                alt={img.date}
                class="w-full h-full object-cover"
                loading="lazy"
              />
              {#if selectedImage === img}
                <div class="absolute inset-0 {isA ? 'bg-blue-600/25' : 'bg-indigo-600/25'} flex items-center justify-center">
                  <svg class="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if selectedImage}
      <div class="bg-gray-50 rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold px-2 py-0.5 rounded border {isA ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'}">
            {selectedYear} 年 {selectedMonth} 月
          </span>
          <span class="text-gray-600 font-mono font-medium">{selectedImage.date}</span>
        </div>
        <div class="aspect-[4/3] bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 relative shadow-inner">
          {#if selectedImage.type === "video"}
            <video src={selectedImage.url} class="max-w-full max-h-full object-contain" autoplay loop muted playsinline></video>
          {:else}
            <img
              src={getLargeMediaUrl(selectedImage)}
              alt={selectedImage.date}
              class="max-w-full max-h-full object-contain"
            />
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    role="dialog"
    aria-modal="true"
    aria-label="跨年份作品對比"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto select-none"
    transition:fade={{ duration: 200 }}
    onclick={onClose}
  >
    <div
      class="relative w-full max-w-6xl bg-white border border-gray-200 rounded-2xl shadow-2xl text-gray-900 flex flex-col max-h-[94vh] overflow-hidden"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- 標題列 -->
      <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
              跨年份作品對比 (Art Comparison)
            </h2>
            <p class="text-xs text-gray-500">
              左右挑選不同年份與月份的作品，一鍵生成高品質歷程對比圖
            </p>
          </div>
        </div>
        <button
          type="button"
          class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          onclick={onClose}
          aria-label="關閉對比視窗"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- 雙欄選圖與預覽 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50">
        {@render comparePanel(
          "A",
          "基準作品 (A)",
          compareYearA,
          availableMonthsA,
          compareMonthA,
          imagesForSelectionA,
          compareImageA,
          (img) => (compareImageA = img)
        )}
        {@render comparePanel(
          "B",
          "對比作品 (B)",
          compareYearB,
          availableMonthsB,
          compareMonthB,
          imagesForSelectionB,
          compareImageB,
          (img) => (compareImageB = img)
        )}
      </div>

      <!-- 底部控制按鈕 -->
      <div class="px-6 py-4 border-t border-gray-100 bg-white flex flex-wrap items-center justify-between gap-4">
        <div class="text-xs text-gray-500 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>將以超高畫質合成緊湊對比圖，自動對齊完整畫作與年月標記</span>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            關閉
          </button>
          <button
            type="button"
            onclick={handleExport}
            disabled={!compareImageA || !compareImageB || isExportingCompare}
            class="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {#if isExportingCompare}
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>合成導出中...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>下載對比圖 (JPG)</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

