<script>
    import { galleryImages } from "../data/gallery";
    import GalleryCard from "./GalleryCard.svelte";
    import SearchBar from "./SearchBar.svelte";

    let searchQuery = "";
    let selectedYear = "全部年份";

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
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !image.hashtags.some((tag) => tag.toLowerCase().includes(query))
            ) {
                return false;
            }
        }
        return true;
    });

    const handleTagClick = (event) => {
        // Custom event detail or direct tag
        const tag = event.detail;
        searchQuery = tag;
    };
    const handleTagClickDirect = (tag) => {
        searchQuery = tag;
    };

    const hashtags = [
        "うみコレオ",
        "しゆのアトリエ",
        "あか絵るら",
        "夢栞の展覧会",
        "沐藝工坊",
        "Shinn手拈來",
        "月城様献上品",
        "蘋安喜樂",
    ];

    // Lightbox Logic
    import { fade, fly } from 'svelte/transition';
    let isModalOpen = false;
    let selectedIndex = 0;

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

<svelte:window on:keydown={handleKeydown} />

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
        <div class="sticky top-0 bg-gray-50 z-10 mb-8 py-4">
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

                    <div class="flex-1 min-w-[100px] md:min-w-[200px]">
                        <SearchBar bind:value={searchQuery} />
                    </div>
                </div>

                <ul
                    class="flex flex-wrap gap-2 mt-2 border-t border-gray-100 md:pt-4"
                >
                    {#each hashtags as tag (tag)}
                        <li>
                            <button
                                on:click={() => handleTagClickDirect(tag)}
                                class="items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors duration-200"
                            >
                                #{tag}
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
        {#if filteredImages.length > 0}
            <div
                class="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-8"
            >
                {#each filteredImages as image (image.url)}
                    <GalleryCard 
                        {image} 
                        on:click-tag={handleTagClick} 
                        on:click-image={(e) => openModal(e.detail)} 
                    />
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all"
        transition:fade={{ duration: 200 }}
        on:click={closeModal}
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
                        src={filteredImages[selectedIndex].url} 
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
