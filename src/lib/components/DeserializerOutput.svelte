<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let deserializedText: string = '';

    const dispatch = createEventDispatcher();

    let parts: string[] = [];

    $: {
        if (deserializedText) {
            // Split by '||' first, then by '|', then by spaces for the bracketed parts
            parts = deserializedText.split('||').flatMap(p => p.split('|')).flatMap(p => p.trim().split(/\s+(?=\{)/)).filter(p => p);
        } else {
            parts = [];
        }
    }

    function handleDragStart(event: DragEvent, part: string) {
        event.dataTransfer?.setData('text/plain', part);
    }

    function handleDelete(partToDelete: string) {
        const newParts = parts.filter(p => p !== partToDelete);
        const newText = newParts.join(' '); // This might need adjustment based on how the parts should be joined back together
        dispatch('update', { value: newText });
    }
</script>

<div class="p-4 border border-gray-700 rounded-lg bg-gray-800/50">
    <h3 class="text-lg font-semibold mb-4">Deserialized Output</h3>
    <div class="flex flex-wrap gap-2">
        {#each parts as part, i (part + i)}
            <div
                class="bg-gray-700 text-gray-200 px-3 py-1 rounded-md flex items-center gap-2"
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, part)}
            >
                <span>{part}</span>
                <button
                    class="text-red-500 hover:text-red-400"
                    on:click={() => handleDelete(part)}
                >
                    &times;
                </button>
            </div>
        {/each}
    </div>
</div>
