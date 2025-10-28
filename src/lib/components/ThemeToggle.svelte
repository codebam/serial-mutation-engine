<script lang="ts">
	import { theme, toggleTheme } from '$lib/stores/themeStore';
</script>

<button
	on:click={toggleTheme}
	class="rounded-md bg-gray-200 p-2 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
>
	{#if $theme === 'dark'}
		<span>🌙 Dark Mode</span>
	{:else}
		<span>☀️ Light Mode</span>
	{/if}
</button>
