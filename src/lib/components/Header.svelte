<script lang="ts">
    import { onMount } from 'svelte';
    import { GithubBrands } from 'svelte-awesome-icons';

    let prevScrollpos = 0;
    let top = '0px';

    onMount(() => {
        prevScrollpos = window.pageYOffset;
        window.onscroll = function() {
            const currentScrollPos = window.pageYOffset;
            if (prevScrollpos > currentScrollPos) {
                top = '0px';
            } else {
                top = '-100px';
            }
            prevScrollpos = currentScrollPos;
        }

        return () => {
            window.onscroll = null;
        }
    });
</script>

<header class="fixed left-0 right-0 bg-gray-900/80 backdrop-blur-md z-50 p-2 transition-all duration-300" style="top: {top}">
    <div class="max-w-screen-3xl mx-auto flex justify-between items-center h-12 px-4 md:px-8">
        <div class="flex items-center space-x-4">
            <a href="/" class="flex items-center">
                <h1 class="text-xl font-bold text-gray-100">
                    Serial Mutation <span class="text-blue-400">Engine</span>
                </h1>
            </a>
            <p class="text-gray-400 text-sm hidden md:block">A professional tool for procedural serial generation and mutation.</p>
        </div>
        <div class="flex items-center space-x-4">
            <a href="https://github.com/codebam/serial-mutation-engine" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline text-sm flex items-center gap-1">
                <GithubBrands class="w-4 h-4" />
                Source Code
            </a>
        </div>
    </div>
</header>
