<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
			if (e.matches) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		};
		mediaQuery.addEventListener('change', handleChange);
		handleChange(mediaQuery);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});
</script>

<header
	class="border-b border-gray-200 bg-gray-100 text-gray-900 dark:border-gray-700 dark:bg-black dark:text-gray-100"
>
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between py-4 md:justify-start md:space-x-10">
			<div class="flex justify-start lg:w-0 lg:flex-1">
				<a href={resolve('/')} class="text-xl font-bold text-gray-900 dark:text-gray-100">
					Serial Mutation <span class="text-blue-600 dark:text-blue-400">Engine</span>
				</a>
			</div>
		</div>
	</div>
</header>
<main class="bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-50">
	<slot />
</main>
<footer class="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
	Version: {$page.data.version}
</footer>
