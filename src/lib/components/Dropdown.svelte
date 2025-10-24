<script lang="ts">
	let { title, btnClasses = '', children } = $props();

	let isOpen = $state(false);
	let dropdown: HTMLElement;

	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdown && !dropdown.contains(event.target as Node)) {
				isOpen = false;
			}
		}

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

<div class="relative inline-block text-left" bind:this={dropdown}>
	<button onclick={() => (isOpen = !isOpen)} class={btnClasses}>
		{title}
		<svg
			class="-mr-1 ml-2 h-5 w-5"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
	{#if isOpen}
		<div
			class="ring-opacity-5 absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black dark:bg-gray-700"
		>
			<div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
				{@render children()}
			</div>
		</div>
	{/if}
</div>
