<script>
  export let image;
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col justify-between group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl p-2 bg-white border border-gray-100/80 transition-all duration-300">
  <div class="flex-1 flex items-center px-1 py-1">
    <div class="w-full overflow-hidden bg-gray-100 rounded-lg cursor-pointer" on:click={() => dispatch('click-image', image)}>
      <img
        src={image.url}
        alt={image.hashtags.join(', ')}
        loading="lazy"
        class="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-300"
      />
    </div>
  </div>
  <div class="p-3">
    <p class="text-gray-400 text-[11px] font-semibold mb-1.5">{image.date}</p>
    <div class="flex flex-wrap gap-1.5 mb-3">
      {#each image.hashtags as tag (tag)}
        <button
          on:click={() => dispatch('click-tag', tag)}
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition-colors duration-200"
        >
          #{tag}
        </button>
      {/each}
    </div>
    <a
      href={image.link}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center justify-center w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
    >
      Twitter(X) Link
      <svg class="w-4 h-4 ml-1.5 -mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
      </svg>
    </a>
  </div>
</div>
