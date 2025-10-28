<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<div
	class="min-h-screen text-light-foreground transition-colors duration-300 dark:text-dark-foreground"
>
	<header
		class="bg-light-background text-light-foreground dark:border-dark-primary dark:bg-dark-surface dark:text-dark-foreground"
	>
		<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4 md:justify-start md:space-x-10">
				<div class="flex justify-start lg:w-0 lg:flex-1">
					<a href={resolve('/')} class="text-xl font-bold text-light-surface dark:text-dark-foreground">
						Serial Mutation <span class="text-dark-blue dark:text-dark-blue">Engine</span>
					</a>
				</div>
				<div class="flex items-center justify-end md:flex-1 lg:w-0">
					<ThemeToggle />
				</div>
			</div>
		</div>
	</header>
	<main>
		<slot />
	</main>
	<footer class="py-4 text-center text-sm text-light-primary dark:text-dark-primary">
		Version: {page.data.version}
	</footer>
</div>
