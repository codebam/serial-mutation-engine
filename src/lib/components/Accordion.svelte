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

<details {open} class={`bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden flex flex-col ${className}`}>
    <summary class="accordion-summary flex items-center justify-between p-4 text-lg font-semibold cursor-pointer list-none hover:bg-gray-700/50">
        {title}
        <div class="flex items-center gap-2">
            {#if actions}
                {@render actions()}
            {/if}
            <svg
                class="w-5 h-5 transition-transform transform details-arrow"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
    </summary>
    <div class={`${noPadding ? '' : 'p-5 pt-2'} flex flex-col gap-6 flex-grow`}>
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
