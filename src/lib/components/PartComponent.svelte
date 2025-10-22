<script lang="ts">
    import type { Part } from '$lib/types';
    import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE, TOK_VARINT } from '$lib/types';
    import Asset from './Asset.svelte';
    import PartName from './PartName.svelte';

    let { part, partService, itemType, onUpdatePart, onUpdatePartList } = $props<{
        part: Part;
        partService: any;
        itemType: string;
        onUpdatePart: (part: Part) => void;
        onUpdatePartList: (part: Part, index: number, value: number) => void;
    }>();

    function updateIndex(value: number) {
        part.index = value;
        onUpdatePart(part);
    }

    function updateValue(value: number) {
        part.value = value;
        onUpdatePart(part);
    }

    function updateListValue(index: number, value: number) {
        onUpdatePartList(part, index, value);
    }

    function addListValue() {
        if (!part.values) {
            part.values = [];
        }
        part.values.push({ type: TOK_VARINT, value: 0 });
        onUpdatePart(part);
    }

    function removeListValue(index: number) {
        if (part.values) {
            part.values.splice(index, 1);
            onUpdatePart(part);
        }
    }
</script>

<div class="flex items-center gap-2">
    <PartName {part} {partService} {itemType} />
    {#if part.subType === SUBTYPE_NONE}
        <Asset value={part.index} onUpdate={updateIndex} />
    {:else}
        <Asset value={part.index} onUpdate={updateIndex} color="bg-blue-200" />
    {/if}
    {#if part.subType === SUBTYPE_INT}
        <Asset value={part.value ?? 0} onUpdate={updateValue} color="bg-green-200" />
    {:else if part.subType === SUBTYPE_LIST}
        <div class="flex flex-wrap gap-2">
            {#if part.values}
                {#each part.values as v, j}
                    <Asset value={v.value} onUpdate={(newValue) => updateListValue(j, newValue)} isVarInt={v.type === TOK_VARINT} onDelete={() => removeListValue(j)} />
                {/each}
            {/if}
            <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={addListValue}>+ Add</button>
        </div>
    {/if}
</div>