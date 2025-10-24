<script lang="ts">
    import { writable } from 'svelte/store';

    export let data;
    const comments = data.comments;
    const apiComments = comments.filter(c => c.tags.some(t => t.tag === 'route'));
    const typeComments = comments.filter(c => c.tags.some(t => t.tag === 'typedef') && !c.tags.some(t => t.tag === 'route'));

    const sidebarOpen = writable(false);

    function toggleSidebar() {
        sidebarOpen.update(value => !value);
    }
</script>

<div class="flex h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
    <!-- Sidebar -->
    <aside
        class="fixed inset-y-0 left-0 w-64 bg-gray-100 dark:bg-gray-800 p-4 transform transition-transform duration-200 ease-in-out z-20"
        class:-translate-x-full={!$sidebarOpen}
    >
        <h1 class="text-2xl font-bold mb-6">API Reference</h1>
        <ul>
            {#each apiComments as commentBlock}
                {@const routeTag = commentBlock.tags.find(t => t.tag === 'route')}
                {#if routeTag}
                    <li>
                        <a href=#{routeTag.name} class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{routeTag.name}</a>
                    </li>
                {/if}
            {/each}
        </ul>
        <h2 class="text-xl font-bold mt-6 mb-4">Types</h2>
        <ul>
            {#each typeComments as commentBlock}
                {@const typeTag = commentBlock.tags.find(t => t.tag === 'typedef')}
                {#if typeTag}
                    <li>
                        <a href=#{typeTag.name} class="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">{typeTag.name}</a>
                    </li>
                {/if}
            {/each}
        </ul>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-8 overflow-y-auto">
        <!-- Hamburger menu -->
        <button
            class="fixed top-4 left-4 p-2 rounded-md bg-gray-200 dark:bg-gray-700 focus:outline-none focus:bg-gray-300 dark:focus:bg-gray-600 z-30"
            on:click={toggleSidebar}
            aria-label="Toggle sidebar"
        >
            <svg
                class="w-6 h-6"
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
            {#each apiComments as commentBlock}
                {@const routeTag = commentBlock.tags.find(t => t.tag === 'route')}
                {#if routeTag}
                    <div id={routeTag.name} class="mb-12">
                        <h2 class="text-3xl font-bold mb-4">
                            <span class="text-green-600 dark:text-green-400">{routeTag.description.split(' ')[0]}</span>
                            <span class="text-gray-600 dark:text-gray-400">{routeTag.description.split(' ')[1]}</span>
                        </h2>

                        <p class="text-gray-700 dark:text-gray-400 mb-6">{@html commentBlock.description.replace(/\n/g, '<br>')}</p>

                        <h3 class="text-xl font-semibold mb-4">Parameters</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'param') as tag}
                                <div class="mb-4">
                                    <p>
                                        <span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
                                        <span class="text-yellow-600 dark:text-yellow-300"> {'{'+tag.type+'}'}</span>
                                    </p>
                                    <p class="text-gray-700 dark:text-gray-400 ml-4">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>

                        <h3 class="text-xl font-semibold mt-6 mb-4">Body</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'body') as tag}
                                <div class="mb-4">
                                    <p>
                                        <span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
                                        <span class="text-yellow-600 dark:text-yellow-300"> {'{'+tag.type+'}'}</span>
                                    </p>
                                    <p class="text-gray-700 dark:text-gray-400 ml-4">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>

                        <h3 class="text-xl font-semibold mt-6 mb-4">Responses</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'returns') as tag}
                                <div class="mb-4">
                                    <p>
                                        <span class="font-bold text-blue-600 dark:text-blue-400">{tag.type}</span>
                                    </p>
                                    <p class="text-gray-700 dark:text-gray-400 ml-4">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>

                        <h3 class="text-xl font-semibold mt-6 mb-4">Throws</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'throws') as tag}
                                <div class="mb-4">
                                    <p>
                                        <span class="font-bold text-red-600 dark:text-red-400">{tag.type}</span>
                                    </p>
                                    <p class="text-gray-700 dark:text-gray-400 ml-4">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>

                        <h3 class="text-xl font-semibold mt-6 mb-4">Examples</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'example') as tag}
                                <div class="mb-4">
                                    <p class="text-gray-700 dark:text-gray-400">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}

            {#each typeComments as commentBlock}
                {@const typeTag = commentBlock.tags.find(t => t.tag === 'typedef')}
                {#if typeTag}
                    <div id={typeTag.name} class="mb-12">
                        <h2 class="text-3xl font-bold mb-4">
                            <span class="text-gray-600 dark:text-gray-400">{typeTag.name}</span>
                        </h2>

                        <p class="text-gray-700 dark:text-gray-400 mb-6">{@html commentBlock.description.replace(/\n/g, '<br>')}</p>

                        <h3 class="text-xl font-semibold mb-4">Properties</h3>
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                            {#each commentBlock.tags.filter(t => t.tag === 'property') as tag}
                                <div class="mb-4">
                                    <p>
                                        <span class="font-bold text-purple-600 dark:text-purple-300">{tag.name}</span>
                                        <span class="text-yellow-600 dark:text-yellow-300"> {'{'+tag.type+'}'}</span>
                                    </p>
                                    <p class="text-gray-700 dark:text-gray-400 ml-4">{@html tag.description.replace(/\n/g, '<br>')}</p>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </main>
</div>
