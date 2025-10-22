
<script lang="ts">
    import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2 } from '$lib/types';
    import type { Part } from '$lib/types';
    import type { PartService } from '$lib/partService';

    let { onAdd, partService, itemType } = $props<{
        onAdd: (token: number, part?: Part) => void;
        partService: PartService;
        itemType: string;
    }>();

    let parts = $derived(partService.getParts(itemType));

    function handleAddPart(event: Event) {
        const select = event.currentTarget as HTMLSelectElement;
        const [subType, index] = select.value.split(':').map(Number);
        if (!isNaN(subType) && !isNaN(index)) {
            onAdd(TOK_PART, { subType, index });
        }
        select.value = "";
    }
</script>

<div class="flex gap-2">
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => onAdd(TOK_VARINT)}>+VARINT</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => onAdd(TOK_VARBIT)}>+VARBIT</button>
    <select class="py-2 px-4 text-sm font-medium text-gray-300 bg-green-700 rounded-md hover:bg-green-600 transition-all" onchange={handleAddPart}>
        <option value="">+PART</option>
        {#each parts as part}
            <option value={`${part.subType}:${part.index}`}>{part.name}</option>
        {/each}
    </select>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" onclick={() => onAdd(TOK_SEP1)}>+SEP1</button>
    <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" onclick={() => onAdd(TOK_SEP2)}>+SEP2</button>
</div>
