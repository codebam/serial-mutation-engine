<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		open = false,
		className = '',
		noPadding = false,
		actions,
		children
	}: {
		title: string;
		open?: boolean;
		className?: string;
		noPadding?: boolean;
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<details
	{open}
	class={`flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
>
	<summary
		class="accordion-summary flex cursor-pointer list-none items-center justify-between p-4 text-lg font-semibold text-gray-900 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700/50"
	>
		{title}
		<div class="flex items-center gap-2">
			{#if actions}
				{@render actions()}
			{/if}
			<svg
				class="details-arrow h-5 w-5 transform transition-transform"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
			</svg>
		</div>
	</summary>
	<div class={`${noPadding ? '' : 'p-5 pt-2'} flex flex-grow flex-col gap-6`}>
		{@render children()}
	</div>
</details>

<style>
	.accordion-summary + .details-arrow {
		transition: transform 0.2s;
	}
	details[open] .details-arrow {
		transform: rotate(90deg);
	}
</style>
