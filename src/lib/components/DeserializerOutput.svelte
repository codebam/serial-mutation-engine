<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let deserializedText: string = '';

    const dispatch = createEventDispatcher();

    let items: { value: string, separator: string }[] = [];
    let draggedIndex: number | null = null;

    function parseText(text: string) {
        if (!text) return [];
        const parsedItems: { value: string, separator: string }[] = [];
        const regex = /(\|\||\||\s+(?=\{))/g;
        
        const parts = text.split(regex).filter(p => p);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.match(regex)) {
                if (parsedItems.length > 0) {
                    parsedItems[parsedItems.length - 1].separator += part;
                }
            } else {
                parsedItems.push({ value: part, separator: '' });
            }
        }
        return parsedItems;
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

<div class="p-4 border border-gray-700 rounded-lg bg-gray-800/50" on:dragover={handleDragOver}>
    <h3 class="text-lg font-semibold mb-4">Deserialized Output</h3>
    <div class="flex flex-wrap gap-2">
        {#each items as item, i (item.value + i)}
            <div
                class="bg-gray-700 text-gray-200 px-3 py-1 rounded-md flex items-center gap-2 cursor-move"
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, i)}
                on:drop={(e) => handleDrop(e, i)}
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