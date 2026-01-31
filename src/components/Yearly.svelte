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
</script>

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
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="aspect-square relative overflow-hidden bg-gray-100 cursor-pointer group/img"
                        on:click={() => cycleImage(month)}
                    >
                        {#if getMonthThumbnail(month, selectedYear, userIndices)}
                            <img
                                src={getMonthThumbnail(
                                    month,
                                    selectedYear,
                                    userIndices,
                                )}
                                alt="{month}月"
                                class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                                loading="lazy"
                            />
                            <!-- Hover overlay for cycle hint -->
                            {#if getMonthCount(month, selectedYear) > 1}
                                <div
                                    class="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <div
                                        class="bg-white/90 px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm"
                                    >
                                        Change
                                    </div>
                                </div>
                            {/if}
                        {:else}
                            <div
                                class="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50"
                            >
                                <span class="text-sm italic font-light"
                                    >No Art</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>
