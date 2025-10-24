<script lang="ts">
	import type { Block, Part } from '$lib/types';
	import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2 } from '$lib/types';
	import Asset from './Asset.svelte';
	import PartComponent from './PartComponent.svelte';
	import type { PartService } from '$lib/partService';

	let { block, partService, onUpdateBlockValue, onUpdatePart, onUpdatePartList } = $props<{
		block: Block;
		partService: PartService;
		onUpdateBlockValue: (value: number) => void;
		onUpdatePart: (part: Part) => void;
		onUpdatePartList: (part: Part, index: number, value: number) => void;
	}>();
</script>

{#if block.token === TOK_VARINT || block.token === TOK_VARBIT}
	<Asset
		value={block.value ?? 0}
		onUpdate={onUpdateBlockValue}
		color={block.token === TOK_VARINT ? 'bg-blue-200 dark:bg-blue-800' : undefined}
	/>
{:else if block.token === TOK_PART && block.part}
	<PartComponent part={block.part} {partService} {onUpdatePart} {onUpdatePartList} />
{:else if block.token === TOK_SEP1}
	<div class="text-gray-500 dark:text-gray-400"></div>
{:else if block.token === TOK_SEP2}
	<div class="text-gray-500 dark:text-gray-400">SEP2</div>
{:else}
	<div class="text-red-600 dark:text-red-400">Unknown Block</div>
{/if}
