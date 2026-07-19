<script>
    import { galleryImages } from "../data/gallery";
    import GalleryCard from "./GalleryCard.svelte";

    let selectedTags = [];
    let selectedYear = "全部年份";
    let innerWidth = 1200;

    $: columnCount = (() => {
        if (innerWidth >= 1280) return 5;
        if (innerWidth >= 1024) return 3;
        if (innerWidth >= 640) return 2;
        return 1;
    })();

    $: columns = (() => {
        const cols = Array.from({ length: columnCount }, () => []);
        filteredImages.forEach((image, index) => {
            cols[index % columnCount].push(image);
        });
        return cols;
    })();

    const availableYears = [
        ...new Set(galleryImages.map((img) => img.date.split("/")[0])),
    ].sort((a, b) => b - a);

    $: filteredImages = galleryImages.filter((image) => {
        // Year filter
        if (
            selectedYear !== "全部年份" &&
            !image.date.startsWith(selectedYear)
        ) {
            return false;
        }
        // Search/Tag filter
        if (selectedTags.length > 0) {
            const hasAnyTag = selectedTags.some(tag => 
                image.hashtags.some(imgTag => imgTag.toLowerCase() === tag.toLowerCase())
            );
            if (!hasAnyTag) {
                return false;
            }
        }
        return true;
    });

    const handleTagClick = (event) => {
        // Custom event detail or direct tag
        const tag = event.detail;
        toggleTag(tag);
    };
    const handleTagClickDirect = (tag) => {
        toggleTag(tag);
    };

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
        } else {
            selectedTags = [...selectedTags, tag];
        }
    };

    $: hashtags = (() => {
        const yearImages = galleryImages.filter((image) => {
            return selectedYear === "全部年份" || image.date.startsWith(selectedYear);
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
    })();

    // Lightbox Logic
    import { fade, fly } from 'svelte/transition';
    let isModalOpen = false;
    let selectedIndex = 0;

    // 將 Twitter 縮圖轉換為高畫質原圖
    const getHighResUrl = (url) => {
        if (!url) return "";
        return url.replace(/name=\w+/, 'name=large');
    };

    // 行動端滑動手勢
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    };

    const handleSwipe = () => {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 50) {
                prevImage(); // 向右滑，看上一張
            } else if (diffX < -50) {
                nextImage(); // 向左滑，看下一張
            }
        } else {
            if (diffY > 100) {
                closeModal(); // 向下滑，關閉燈箱
            }
        }
    };

    const openModal = (image) => {
        selectedIndex = filteredImages.findIndex(img => img.url === image.url);
        isModalOpen = true;
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        isModalOpen = false;
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'auto';
        }
    };

    const nextImage = () => {
        selectedIndex = (selectedIndex + 1) % filteredImages.length;
    };

    const prevImage = () => {
        selectedIndex = (selectedIndex - 1 + filteredImages.length) % filteredImages.length;
    };

    const handleKeydown = (event) => {
        if (!isModalOpen) return;
        if (event.key === 'Escape') closeModal();
        if (event.key === 'ArrowRight') nextImage();
        if (event.key === 'ArrowLeft') prevImage();
    };
</script>

<svelte:window bind:innerWidth on:keydown={handleKeydown} />

<div class="min-h-screen bg-gray-50 py-12 px-2 md:px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto 2xl:max-w-[1920px]">
        <div class="text-center mb-12">
            <h1
                class="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight lg:text-5xl"
            >
                DIANAxAKKO Fan Art Gallery
            </h1>
            <p class="mt-5 max-w-4xl mx-auto text-base text-gray-500">
                由於推特（Ｘ）的 HashTag 一直都沒修好, 導致查詢時會遺漏,
                所以做了一個連結自己畫的粉絲圖的網站...
            </p>
            <p class="mt-5 max-w-4xl mx-auto text-base text-gray-500">
                Twitter（X）のハッシュタグがずっと直らなくて、検索するとどうしても抜け漏れが出ちゃうので、自分の描いたファンアートをまとめて見られるサイトを作りました……
            </p>
            <p class="mt-1 max-w-4xl mx-auto text-[14px] text-blue-500">
                Updated: {galleryImages[0].date}
            </p>
        </div>
        <div class="mb-8 py-4 border-b border-gray-200/40">
            <div class="mx-auto px-4">
                <div class="flex flex-wrap gap-4 mb-4">
                    <div
                        class="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
                    >
                        <label
                            for="year-select"
                            class="text-sm font-semibold text-gray-600 flex items-center gap-1.5"
                        >
                            <svg
                                class="w-4 h-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
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
                                        class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                        on:click={() => toggleTag(tag)}
                                    >
                                        <span class="sr-only">移除 {tag}</span>
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                    </button>
                                </span>
                            {/each}
                        {/if}
                    </div>

                    {#if selectedYear !== "全部年份" || selectedTags.length > 0}
                        <button
                            on:click={() => {
                                selectedYear = "全部年份";
                                selectedTags = [];
                            }}
                            title="清除所有篩選"
                            aria-label="清除所有篩選"
                            class="p-2.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    {/if}
                </div>

                <ul
                    class="flex flex-wrap gap-2 mt-2 border-t border-gray-100/80 pt-3 md:pt-4"
                >
                    {#each hashtags as tag (tag)}
                        <li>
                            <button
                                on:click={() => handleTagClickDirect(tag)}
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
        {#if filteredImages.length > 0}
            <div class="flex gap-6 items-start">
                {#each columns as col, colIdx}
                    <div class="flex-1 flex flex-col gap-6">
                        {#each col as image (image.url)}
                            <GalleryCard 
                                {image} 
                                on:click-tag={handleTagClick} 
                                on:click-image={(e) => openModal(e.detail)} 
                            />
                        {/each}
                    </div>
                {/each}
            </div>
        {:else}
            <div class="text-center py-12">
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
            </div>
        {/if}
    </div>
</div>

{#if isModalOpen}
    <!-- Modal Overlay -->
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all select-none"
        transition:fade={{ duration: 200 }}
        on:click={closeModal}
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
    >
        <!-- Close Button -->
        <button 
            class="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-[60]"
            on:click|stopPropagation={closeModal}
        >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <!-- Navigation Buttons -->
        <button 
            class="absolute left-4 md:left-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60]"
            on:click|stopPropagation={prevImage}
        >
            <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </button>

        <button 
            class="absolute right-4 md:right-8 p-3 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-[60]"
            on:click|stopPropagation={nextImage}
        >
            <svg class="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        </button>

        <!-- Content Area -->
        <div 
            class="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            on:click|stopPropagation
        >
            {#key selectedIndex}
                <div 
                    class="relative"
                    in:fly={{ y: 20, duration: 300, delay: 100 }}
                    out:fade={{ duration: 200 }}
                >
                    <img 
                        src={getHighResUrl(filteredImages[selectedIndex].url)} 
                        alt="Gallery Large View" 
                        class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />
                    
                    <!-- Image Info Overlay -->
                    <div class="mt-4 text-center">
                        <div class="flex items-center justify-center gap-4 mb-2">
                            <span class="text-white font-medium text-lg">
                                {filteredImages[selectedIndex].date}
                            </span>
                            <a 
                                href={filteredImages[selectedIndex].link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-all hover:scale-105"
                            >
                                Twitter (X)
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                        <div class="flex flex-wrap justify-center gap-2">
                            {#each filteredImages[selectedIndex].hashtags as tag}
                                <span class="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs">
                                    #{tag}
                                </span>
                            {/each}
                        </div>
                        <p class="text-white/40 text-xs mt-4">
                            {selectedIndex + 1} / {filteredImages.length}
                        </p>
                    </div>
                </div>
            {/key}
        </div>
    </div>
{/if}
