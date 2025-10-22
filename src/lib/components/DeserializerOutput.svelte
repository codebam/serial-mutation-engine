<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let deserializedText: string = '';

    const dispatch = createEventDispatcher();

    let items: { value: string, separator: string }[] = [];
    let draggedIndex: number | null = null;

    function parseText(text: string) {
        if (!text) return [];
        const regex = /(\|\||\||\s+(?=\{))/g;
        const partsAndSeps = text.split(regex);
        const parsedItems: { value: string, separator: string }[] = [];

        for (let i = 0; i < partsAndSeps.length; i++) {
            if (i % 2 === 0) {
                // It's a value part
                parsedItems.push({ value: partsAndSeps[i], separator: '' });
            } else {
                // It's a separator part
                if (parsedItems.length > 0) {
                    parsedItems[parsedItems.length - 1].separator = partsAndSeps[i];
                }
            }
        }
        return parsedItems.filter(p => p.value || p.separator);
    }

    $: {
        items = parseText(deserializedText);
    }

    function updateText() {
        const newText = items.map(item => item.value + item.separator).join('');
        dispatch('update', { value: newText });
    }

    function handleDelete(index: number) {
        items.splice(index, 1);
        items = items; // Trigger reactivity
        updateText();
    }

    function handleDragStart(event: DragEvent, index: number) {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', index.toString());
            draggedIndex = index;
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const draggedItem = items[draggedIndex];
        items.splice(draggedIndex, 1);
        items.splice(dropIndex, 0, draggedItem);

        items = items; // Trigger reactivity
        updateText();
        draggedIndex = null;
    }
</script>

<div class="p-4 border border-gray-700 rounded-lg bg-gray-800/50" on:dragover={handleDragOver} role="list">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Deserialized Output</h3>
        <button
            class="bg-gray-600 hover:bg-gray-500 text-gray-200 px-3 py-1 rounded-md"
            on:click={() => navigator.clipboard.writeText(deserializedText)}
        >
            Copy
        </button>
    </div>
    <div class="flex flex-wrap gap-2">
        {#each items as item, i (item.value + i)}
            <div
                class="bg-gray-700 text-gray-200 px-3 py-1 rounded-md flex items-center gap-2 cursor-move"
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, i)}
                on:drop={(e) => handleDrop(e, i)}
                role="listitem"
            >
                <span>{item.value}</span>
                <button
                    class="text-red-500 hover:text-red-400"
                    on:click={() => handleDelete(i)}
                >
                    &times;
                </button>
            </div>
        {/each}
    </div>
</div>