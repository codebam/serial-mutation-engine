<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e) => {
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

<header class="border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between py-4 md:justify-start md:space-x-10">
			<div class="flex justify-start lg:w-0 lg:flex-1">
				<a href={resolve('/')} class="text-xl font-bold text-gray-900 dark:text-white">
					Serial Mutation <span class="text-blue-500">Engine</span>
				</a>
			</div>
		</div>
	</div>
</header>
<main class="">
	<slot />
</main>
