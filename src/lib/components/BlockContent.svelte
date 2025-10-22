
<script lang="ts">
    import type { Block, Part } from '$lib/types';
    import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2 } from '$lib/types';
    import Asset from './Asset.svelte';
import PartComponent from './PartComponent.svelte';

    let { block, partService, itemType, onUpdateBlockValue, onUpdatePart, onUpdatePartList } = $props<{
        block: Block;
        partService: any;
        itemType: string;
        onUpdateBlockValue: (value: number) => void;
        onUpdatePart: (part: Part) => void;
        onUpdatePartList: (part: Part, index: number, value: number) => void;
    }>();
</script>

{#if block.token === TOK_VARINT || block.token === TOK_VARBIT}
    <Asset value={block.value ?? 0} onUpdate={onUpdateBlockValue} isVarInt={block.token === TOK_VARINT} />
{:else if block.token === TOK_PART && block.part}
    <PartComponent part={block.part} {partService} {itemType} onUpdatePart={onUpdatePart} onUpdatePartList={onUpdatePartList} />
{:else if block.token === TOK_SEP1}
    <div class="text-gray-400">SEP1</div>
{:else if block.token === TOK_SEP2}
    <div class="text-gray-400">SEP2</div>
{:else}
    <div class="text-red-500">Unknown Block</div>
{/if}
