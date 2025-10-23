<script lang="ts">
	import type { Block, Part } from '$lib/types';
	import BlockContent from './BlockContent.svelte';

	let {
		block,
		partService,
		itemType,
		onDelete,
		onAddBefore,
		onAddAfter,
		onUpdateBlockValue,
		onUpdatePart,
		onUpdatePartList,
		ondragstart
	} = $props<{
		block: Block;
		partService: PartService;
		itemType: string;
		onDelete: () => void;
		onAddBefore: () => void;
		onAddAfter: () => void;
		onUpdateBlockValue: (value: number) => void;
		onUpdatePart: (part: Part) => void;
		onUpdatePartList: (part: Part, index: number, value: number) => void;
		ondragstart: (event: DragEvent) => void;
	}>();

	let showJson = $state(false);
</script>

<div
	class="flex flex-col gap-2 rounded-md border border-gray-700 bg-gray-800 p-2"
	draggable="true"
	{ondragstart}
	role="listitem"
>
	<div class="flex items-center gap-2">
		<button class="text-gray-400 hover:text-white">☰</button>
		<BlockContent
			{block}
			{partService}
			{itemType}
			{onUpdateBlockValue}
			{onUpdatePart}
			{onUpdatePartList}
		/>
		<div class="ml-auto flex gap-1">
			<button class="text-gray-400 hover:text-white" onclick={() => (showJson = !showJson)}
				>JSON</button
			>
			<button class="text-gray-400 hover:text-white" onclick={onAddBefore}>+</button>
			<button class="text-red-500 hover:text-red-400" onclick={onDelete}>X</button>
			<button class="text-gray-400 hover:text-white" onclick={onAddAfter}>+</button>
		</div>
	</div>
	{#if showJson}
		<pre class="rounded-md bg-gray-900 p-2 text-xs text-gray-300">{JSON.stringify(
				block,
				null,
				2
			)}</pre>
	{/if}
</div>
