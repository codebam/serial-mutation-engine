
<script lang="ts">
    import type { Block, Part } from '$lib/types';
    import BlockContent from './BlockContent.svelte';

    let { block, onDelete, onAddBefore, onAddAfter, onUpdateBlockValue, onUpdatePart, onUpdatePartList, index } = $props<{
        block: Block;
        onDelete: () => void;
        onAddBefore: () => void;
        onAddAfter: () => void;
        onUpdateBlockValue: (value: number) => void;
        onUpdatePart: (part: Part) => void;
        onUpdatePartList: (part: Part, index: number, value: number) => void;
        index: number;
    }>();

    let showJson = $state(false);

    function handleDragStart(event: DragEvent) {
        event.dataTransfer!.setData('text/plain', index.toString());
    }

</script>

<div class="flex flex-col gap-2 p-2 bg-gray-800 border border-gray-700 rounded-md" draggable="true" ondragstart={handleDragStart} role="listitem">
    <div class="flex items-center gap-2">
        <button class="text-gray-400 hover:text-white">☰</button>
        <BlockContent {block} {onUpdateBlockValue} {onUpdatePart} {onUpdatePartList} />
        <div class="flex gap-1 ml-auto">
            <button class="text-gray-400 hover:text-white" onclick={() => showJson = !showJson}>JSON</button>
            <button class="text-gray-400 hover:text-white" onclick={onAddBefore}>+</button>
            <button class="text-red-500 hover:text-red-400" onclick={onDelete}>X</button>
            <button class="text-gray-400 hover:text-white" onclick={onAddAfter}>+</button>
        </div>
    </div>
    {#if showJson}
        <pre class="text-xs text-gray-300 bg-gray-900 p-2 rounded-md">{JSON.stringify(block, null, 2)}</pre>
    {/if}
</div>
