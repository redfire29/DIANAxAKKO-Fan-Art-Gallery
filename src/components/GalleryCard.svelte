<script>
  import {
    getSourceLabel,
    getSourceLink,
    getThumbnailUrl,
  } from "../utils/galleryMedia";

  let { image, onTagClick = () => {}, onImageClick = () => {} } = $props();

  let loaded = $state(false);
  let mediaEl = $state(null);

  let isYoutube = $derived(image.type === "youtube");
  let isVideo = $derived(image.type === "video");
  let imgUrl = $derived(getThumbnailUrl(image));
  let linkUrl = $derived(getSourceLink(image));

  // 若瀏覽器快取或 SSR 預載已完成，於掛載／換圖時立即解除 skeleton
  $effect(() => {
    imgUrl;
    if (!mediaEl) return;
    if (isVideo) {
      if (mediaEl.readyState >= 2) loaded = true;
    } else if (mediaEl.complete && mediaEl.naturalWidth > 0) {
      loaded = true;
    }
  });

  const handleImageClick = () => {
    if (isYoutube && typeof window !== "undefined") {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    } else {
      onImageClick(image);
    }
  };
</script>

<article class="flex flex-col justify-between group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl p-2 bg-white border border-gray-100/80 transition-all duration-300">
  <div class="flex-1 flex items-center px-1 py-1">
    <button
      type="button"
      onclick={handleImageClick}
      aria-label={isYoutube ? `前往 YouTube Shorts 觀看 ${image.date} 作品` : `放大檢視 ${image.date} 作品`}
      class="block w-full text-left relative overflow-hidden bg-gray-100 rounded-lg cursor-pointer min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {#if !loaded}
        <div class="absolute inset-0 bg-gray-200 animate-pulse"></div>
      {/if}

      {#if isVideo}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={mediaEl}
          src={imgUrl}
          onloadeddata={() => (loaded = true)}
          autoplay
          loop
          muted
          playsinline
          class="w-full h-auto block transition-all duration-500 group-hover:scale-[1.02] {loaded ? 'opacity-100' : 'opacity-0'}"
        ></video>
      {:else}
        <img
          bind:this={mediaEl}
          src={imgUrl}
          alt={image.hashtags.join(", ")}
          loading="lazy"
          onload={() => (loaded = true)}
          onerror={() => (loaded = true)}
          class="w-full h-auto block transition-all duration-500 group-hover:scale-[1.02] {loaded ? 'opacity-100' : 'opacity-0'}"
        />
      {/if}

      {#if isYoutube}
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-transform duration-500 group-hover:scale-[1.05]">
          <div class="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-red-600 transition-colors duration-300 shadow-lg">
            <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      {/if}
    </button>
  </div>

  <div class="p-3">
    <p class="text-gray-400 text-[11px] font-semibold mb-1.5">{image.date}</p>
    <div class="flex flex-wrap gap-1.5 mb-3">
      {#each image.hashtags as tag (tag)}
        <button
          type="button"
          onclick={() => onTagClick(tag)}
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition-colors duration-200"
        >
          #{tag}
        </button>
      {/each}
    </div>
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
    >
      {getSourceLabel(image)}
      <svg class="w-4 h-4 ml-1.5 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        ></path>
      </svg>
    </a>
  </div>
</article>
