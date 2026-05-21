<script>
    import { onMount } from "svelte";
    import { galleryImages } from "../data/gallery";

    let selectedYear = "2025";
    let userIndices = {};

    // Load persisted indices from localStorage
    onMount(() => {
        const saved = localStorage.getItem("yearly-gallery-indices");
        if (saved) {
            try {
                userIndices = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved indices", e);
            }
        }
    });

    // Update localStorage when indices change - handled via reactive statement below
    $: if (typeof localStorage !== "undefined") {
        localStorage.setItem(
            "yearly-gallery-indices",
            JSON.stringify(userIndices),
        );
    }

    const availableYears = [
        ...new Set(galleryImages.map((img) => img.date.split("/")[0])),
    ].sort((a, b) => a - b);

    $: yearlyTotalCount = galleryImages.filter((img) =>
        img.date.startsWith(selectedYear),
    ).length;

    const getMonthData = (month, year = selectedYear) => {
        const monthStr = month.toString().padStart(2, "0");
        // Vue version reversed it, matching that logic
        return galleryImages
            .filter((img) => img.date.startsWith(`${year}/${monthStr}`))
            .reverse();
    };

    const getMonthCount = (month, year = selectedYear) => {
        return getMonthData(month, year).length;
    };

    const getMonthThumbnail = (
        month,
        year = selectedYear,
        indices = userIndices,
    ) => {
        const data = getMonthData(month, year);
        if (data.length === 0) return null;

        const key = `${year}-${month}`;
        const index = indices[key] || 0;

        // Ensure index is within bounds if data changed
        const safeIndex = index % data.length;
        return data[safeIndex].url;
    };

    const cycleImage = (month) => {
        const count = getMonthCount(month);
        if (count <= 1) return;

        const key = `${selectedYear}-${month}`;
        const currentIndex = userIndices[key] || 0;
        // Svelte reactivity: assign new object to trigger updates
        userIndices = {
            ...userIndices,
            [key]: (currentIndex + 1) % count,
        };
    };

    const getUserIndex = (
        month,
        year = selectedYear,
        indices = userIndices,
    ) => {
        const key = `${year}-${month}`;
        return (indices[key] || 0) + 1;
    };

    const cycleImagePrev = (month) => {
        const count = getMonthCount(month);
        if (count <= 1) return;

        const key = `${selectedYear}-${month}`;
        const currentIndex = userIndices[key] || 0;
        userIndices = {
            ...userIndices,
            [key]: (currentIndex - 1 + count) % count,
        };
    };

    // Lightbox Logic for Yearly Gallery
    import { fade, fly } from 'svelte/transition';
    let isModalOpen = false;
    let selectedModalImageIndex = 0;
    let modalImages = [];

    const getHighResUrl = (url) => {
        if (!url) return "";
        return url.replace(/name=\w+/, 'name=large');
    };

    const openModalForMonth = (month) => {
        const data = getMonthData(month, selectedYear);
        if (data.length === 0) return;
        
        modalImages = data;
        const key = `${selectedYear}-${month}`;
        const currentIdx = userIndices[key] || 0;
        selectedModalImageIndex = currentIdx % data.length;
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
        if (modalImages.length === 0) return;
        selectedModalImageIndex = (selectedModalImageIndex + 1) % modalImages.length;
    };

    const prevImage = () => {
        if (modalImages.length === 0) return;
        selectedModalImageIndex = (selectedModalImageIndex - 1 + modalImages.length) % modalImages.length;
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
                prevImage();
            } else if (diffX < -50) {
                nextImage();
            }
        } else {
            if (diffY > 100) {
                closeModal();
            }
        }
    };

    const handleKeydown = (event) => {
        if (!isModalOpen) return;
        if (event.key === 'Escape') closeModal();
        if (event.key === 'ArrowRight') nextImage();
        if (event.key === 'ArrowLeft') prevImage();
    };
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto 2xl:max-w-[1920px]">
        <div class="text-center mb-4">
            <div class="mb-6 flex justify-center gap-4">
                {#each availableYears as year (year)}
                    <button
                        on:click={() => (selectedYear = year)}
                        class="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 transition-colors {selectedYear ===
                        year
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    >
                        {year}
                    </button>
                {/each}
            </div>
            <h1
                class="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl"
            >
                {selectedYear} 年度表
            </h1>
            <p
                class="mt-2 text-sm font-medium text-blue-600 bg-blue-50 inline-block px-4 py-1 rounded-full"
            >
                今年總計：{yearlyTotalCount} 張作品
            </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {#each Array(12) as _, i}
                {@const month = i + 1}
                <div
                    class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 group flex flex-col"
                >
                    <!-- Month Header -->
                    <div
                        class="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center"
                    >
                        <span class="font-bold text-gray-900">{month} 月</span>
                        {#if getMonthCount(month, selectedYear) > 0}
                            <span class="text-xs text-gray-400 font-medium">
                                {getUserIndex(month, selectedYear, userIndices)} /
                                {getMonthCount(month, selectedYear)}
                            </span>
                        {/if}
                    </div>

                    <!-- Image Container -->
                    <div
                        class="aspect-square relative overflow-hidden bg-gray-100 group/img border-t border-gray-100/50"
                    >
                        {#if getMonthThumbnail(month, selectedYear, userIndices)}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                            <img
                                src={getMonthThumbnail(
                                    month,
                                    selectedYear,
                                    userIndices,
                                )}
                                alt="{month}月"
                                class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 cursor-pointer"
                                loading="lazy"
                                on:click={() => openModalForMonth(month)}
                            />
                            
                            <!-- 左右輪播微型按鈕 (當圖片張數 > 1 時) -->
                            {#if getMonthCount(month, selectedYear) > 1}
                                <button
                                    class="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 cursor-pointer z-10 border border-white/10"
                                    on:click|stopPropagation={() => cycleImagePrev(month)}
                                    aria-label="Previous image"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all opacity-0 group-hover/img:opacity-100 cursor-pointer z-10 border border-white/10"
                                    on:click|stopPropagation={() => cycleImage(month)}
                                    aria-label="Next image"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            {/if}
                        {:else}
                            <div
                                class="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-4"
                            >
                                <svg class="w-10 h-10 text-gray-300/80 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
        {#if modalImages.length > 1}
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
        {/if}

        <!-- Content Area -->
        <div 
            class="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center justify-center"
            on:click|stopPropagation
        >
            {#key selectedModalImageIndex}
                <div 
                    class="relative"
                    in:fly={{ y: 20, duration: 300, delay: 100 }}
                    out:fade={{ duration: 200 }}
                >
                    <img 
                        src={getHighResUrl(modalImages[selectedModalImageIndex].url)} 
                        alt="Gallery Large View" 
                        class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />
                    
                    <!-- Image Info Overlay -->
                    <div class="mt-4 text-center text-white">
                        <div class="flex items-center justify-center gap-4 mb-2">
                            <span class="font-medium text-lg">
                                {modalImages[selectedModalImageIndex].date}
                            </span>
                            <a 
                                href={modalImages[selectedModalImageIndex].link} 
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
                            {#each modalImages[selectedModalImageIndex].hashtags as tag}
                                <span class="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs">
                                    #{tag}
                                </span>
                            {/each}
                        </div>
                        {#if modalImages.length > 1}
                            <p class="text-white/40 text-xs mt-4">
                                {selectedModalImageIndex + 1} / {modalImages.length}
                            </p>
                        {/if}
                    </div>
                </div>
            {/key}
        </div>
    </div>
{/if}
