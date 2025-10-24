<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let deserializedText: string = '';

	const dispatch = createEventDispatcher();

	let items: { value: string; separator: string }[] = [];
	let draggedIndex: number | null = null;

	function parseText(text: string) {
		if (!text) return [];
		const regex = /(\|\||\||\s+(?=\{))/g;
		const partsAndSeps = text.split(regex);
		const parsedItems: { value: string; separator: string }[] = [];

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
		return parsedItems.filter((p) => p.value || p.separator);
	}

	$: {
		items = parseText(deserializedText);
	}

	function updateText() {
		const newText = items.map((item) => item.value + item.separator).join('');
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

<div
	class="rounded-lg border border-gray-300 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800/50"
	on:dragover={handleDragOver}
	role="list"
>
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Deserialized Output</h3>
		<button
			class="rounded-md bg-gray-200 px-3 py-1 text-gray-900 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
			on:click={() => navigator.clipboard.writeText(deserializedText)}
		>
			Copy
		</button>
	</div>
	<div class="flex flex-wrap gap-2">
		{#each items as item, i (item.value + i)}
			<div
				class="flex cursor-move items-center gap-2 rounded-md bg-gray-200 px-3 py-1 text-gray-900 dark:bg-gray-700 dark:text-gray-200"
				draggable="true"
				on:dragstart={(e) => handleDragStart(e, i)}
				on:drop={(e) => handleDrop(e, i)}
				role="listitem"
			>
				<span>{item.value}</span>
				<button
					class="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
					on:click={() => handleDelete(i)}
				>
					&times;
				</button>
			</div>
		{/each}
	</div>
</div>
