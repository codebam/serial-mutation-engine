<script lang="ts">
	import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP2 } from '../types';
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
		const selectedValue = select.value;
		const selectedPart = parts.find(
			(p) =>
				`${p.subType}:${p.index}${p.value !== undefined ? ':' + p.value : ''}` === selectedValue
		);

		if (selectedPart) {
			const newPart: Part = { subType: selectedPart.subType, index: selectedPart.index };
			if (selectedPart.value !== undefined) {
				newPart.value = selectedPart.value;
			}
			onAdd(TOK_PART, newPart);
		}
		select.value = '';
	}
</script>

<div class="flex flex-col gap-2">
	<button
		class="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-all hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
		onclick={() => onAdd(TOK_VARINT)}>+VARINT</button
	>
	<button
		class="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-all hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
		onclick={() => onAdd(TOK_VARBIT)}>+VARBIT</button
	>
	<select
		class="w-full rounded-md bg-green-600 px-4 py-2 text-center text-sm font-medium text-white transition-all hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
		onchange={handleAddPart}
	>
		<option value="">+PART</option>
		{#each parts as part (part.code)}
			<option
				value={`${part.subType}:${part.index}${part.value !== undefined ? ':' + part.value : ''}`}
				>{part.name} ({part.code})</option
			>
		{/each}
	</select>
	<button
		class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
		>+SEP1</button
	>
	<button
		class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
		onclick={() => onAdd(TOK_SEP2)}>+SEP2</button
	>
</div>
