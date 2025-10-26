<script lang="ts">
	import { writable } from 'svelte/store';

	export let data;
	const comments = data.comments;
	const apiComments = comments.filter((c) => c.tags.some((t) => t.tag === 'route'));
	const typeComments = comments.filter(
		(c) => c.tags.some((t) => t.tag === 'typedef')
	);
	const functionComments = comments.filter(
		(c) => c.tags.some((t) => t.tag === 'name')
	);
	console.log({comments});

	const sidebarOpen = writable(false);

	function toggleSidebar() {
		sidebarOpen.update((value) => !value);
	}
</script>

<div class="flex h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200">
	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-20 w-64 transform bg-gray-100 p-4 transition-transform duration-200 ease-in-out dark:bg-gray-800"
		class:-translate-x-full={!$sidebarOpen}
	>
		<h1 class="mb-6 text-2xl font-bold">API Reference</h1>
		<ul>
			{#each apiComments as commentBlock (JSON.stringify(commentBlock))}
				{@const routeTag = commentBlock.tags.find((t) => t.tag === 'route')}
				{#if routeTag}
					<li>
						<a
							href="#{routeTag.description.split(' ')[1]}"
							class="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
							>{routeTag.description.split(' ')[1]}</a
						>
					</li>
				{/if}
			{/each}
		</ul>
		<h2 class="mt-6 mb-4 text-xl font-bold">Functions</h2>
		<ul>
			{#each functionComments as commentBlock (JSON.stringify(commentBlock))}
				{@const nameTag = commentBlock.tags.find((t) => t.tag === 'name')}
				{#if nameTag}
					<li>
						<a
							href="#{nameTag.name}"
							class="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
							>{nameTag.name}</a
						>
					</li>
				{/if}
			{/each}
		</ul>
		<h2 class="mt-6 mb-4 text-xl font-bold">Types</h2>
		<ul>
			{#each typeComments as commentBlock (JSON.stringify(commentBlock))}
				{@const typeTag = commentBlock.tags.find((t) => t.tag === 'typedef')}
				{#if typeTag}
					<li>
						<a
							href="#{typeTag.name}"
							class="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
							>{typeTag.name}</a
						>
					</li>
				{/if}
			{/each}
		</ul>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-y-auto p-8">
		<!-- Hamburger menu -->
		<button
			class="fixed top-4 left-4 z-30 rounded-md bg-gray-200 p-2 focus:bg-gray-300 focus:outline-none dark:bg-gray-700 dark:focus:bg-gray-600"
			on:click={toggleSidebar}
			aria-label="Toggle sidebar"
		>
			<svg
				class="h-6 w-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				></path>
			</svg>
		</button>

		{#if comments.length === 0}
			<p>No documentation found.</p>
		{:else}
			{#each apiComments as commentBlock (JSON.stringify(commentBlock))}
				{@const routeTag = commentBlock.tags.find((t) => t.tag === 'route')}
				{#if routeTag}
					<div id={routeTag.name} class="mb-12">
						<h2 class="mb-4 text-3xl font-bold">
							<span class="text-green-600 dark:text-green-400"
								>{routeTag.description.split(' ')[0]}</span
							>
							<span class="text-gray-600 dark:text-gray-400"
								>{routeTag.description.split(' ')[1]}</span
							>
						</h2>

						<p class="mb-6 text-gray-700 dark:text-gray-400">
							{commentBlock.description.replace(/\n/g, '<br>')}
						</p>

						<h3 class="mb-4 text-xl font-semibold">Parameters</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'param') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
										<span class="text-yellow-600 dark:text-yellow-300">
											{'{' + tag.type + '}'}</span
										>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>

						<h3 class="mt-6 mb-4 text-xl font-semibold">Body</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'body') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
										<span class="text-yellow-600 dark:text-yellow-300">
											{'{' + tag.type + '}'}</span
										>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>

						<h3 class="mt-6 mb-4 text-xl font-semibold">Responses</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'returns') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-blue-600 dark:text-blue-400">{tag.type}</span>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>

						<h3 class="mt-6 mb-4 text-xl font-semibold">Throws</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'throws') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-red-600 dark:text-red-400">{tag.type}</span>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>

						<h3 class="mt-6 mb-4 text-xl font-semibold">Examples</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'example') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p class="text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>
					</div>
				{/if}
			{/each}

			{#each functionComments as commentBlock (JSON.stringify(commentBlock))}
				{@const nameTag = commentBlock.tags.find((t) => t.tag === 'name')}
				{#if nameTag}
					<div id={nameTag.name} class="mb-12">
						<h2 class="mb-4 text-3xl font-bold">
							<span class="text-gray-600 dark:text-gray-400">{nameTag.name}</span>
						</h2>

						<p class="mb-6 text-gray-700 dark:text-gray-400">
							{commentBlock.description.replace(/\n/g, '<br>')}
						</p>

						<h3 class="mb-4 text-xl font-semibold">Parameters</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'param') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
										<span class="text-yellow-600 dark:text-yellow-300">
											{'{' + tag.type + '}'}</span
										>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>

						<h3 class="mt-6 mb-4 text-xl font-semibold">Returns</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'returns') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-blue-600 dark:text-blue-400">{tag.type}</span>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>
					</div>
				{/if}
			{/each}

			{#each typeComments as commentBlock (JSON.stringify(commentBlock))}
				{@const typeTag = commentBlock.tags.find((t) => t.tag === 'typedef')}
				{#if typeTag}
					<div id={typeTag.name} class="mb-12">
						<h2 class="mb-4 text-3xl font-bold">
							<span class="text-gray-600 dark:text-gray-400">{typeTag.name}</span>
						</h2>

						<p class="mb-6 text-gray-700 dark:text-gray-400">
							{commentBlock.description.replace(/\n/g, '<br>')}
						</p>

						<h3 class="mb-4 text-xl font-semibold">Properties</h3>
						<div class="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
							{#each commentBlock.tags.filter((t) => t.tag === 'property') as tag (JSON.stringify(tag))}
								<div class="mb-4">
									<p>
										<span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
										<span class="text-yellow-600 dark:text-yellow-300">
											{'{' + tag.type + '}'}</span
										>
									</p>
									<p class="ml-4 text-gray-700 dark:text-gray-400">
										{tag.description.replace(/\n/g, '<br>')}
									</p>
								</div>
							{/each}
							</div>
					</div>
				{/if}
			{/each}
		{/if}
	</main>
</div>
