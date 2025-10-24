<script lang="ts">
	import type { Serial, Block } from '$lib/types';
	import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, SUBTYPE_NONE } from '$lib/types';
	import FormGroup from './FormGroup.svelte';
	import BlockComponent from './Block.svelte';
	import AddBlockMenu from './AddBlockMenu.svelte';

	import { browser } from '$app/environment';
	import { PartService } from '$lib/partService';
	import Worker from '$lib/worker/worker.js?worker';

	let { serial, onSerialUpdate } = $props<{
		serial: string;
		onSerialUpdate: (newSerial: string) => void;
	}>();
	let parsed: Serial = $state([]);
	let error: string | null = $state(null);
	let itemType = $state('UNKNOWN');
	let pastedContent = $state('');

	$effect(() => {
		if (pastedContent) {
			if (worker) {
				worker.postMessage({ type: 'parse_pasted_content', payload: pastedContent });
			}
		}
	});

	class DummyPartService {
		loadPartData() {
			return Promise.resolve();
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		findPartName(part) {
			return null;
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		getParts(itemType) {
			return [];
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		determineItemType(parsed) {
			return 'UNKNOWN';
		}
	}

	let partService: PartService | DummyPartService = $state(new DummyPartService());
	let worker: Worker | undefined;

	if (browser) {
		worker = new Worker();
		partService = new PartService(worker);

		$effect(() => {
			partService.loadPartData();
		});

		worker.onmessage = (e) => {
			const { type, payload } = e.data;
			if (type === 'parsed_serial') {
				parsed = payload.parsed;
				itemType = partService.determineItemType(payload.parsed);
				error = payload.error;
			} else if (type === 'encoded_serial') {
				if (payload.serial !== serial) {
					onSerialUpdate(payload.serial);
				}
				error = payload.error;
			} else if (type === 'pasted_content_parsed') {
				if (payload.error) {
					error = payload.error;
				} else {
					parsed = payload.parsed;
					updateSerial();
					error = null;
					pastedContent = '';
				}
			}
		};
	}

	function analyzeSerial() {
		if (!serial) {
			parsed = [];
			error = null;
			return;
		}
		if (worker) {
			worker.postMessage({ type: 'parse_serial', payload: serial });
		}
	}

	function updateSerial() {
		if (parsed) {
			const plainParsed = JSON.parse(JSON.stringify(parsed));
			worker.postMessage({ type: 'encode_serial', payload: plainParsed });
		}
	}

	$effect(() => {
		analyzeSerial();
	});

	$effect(() => {
		if (parsed && parsed.length > 0) {
			itemType = partService.determineItemType(parsed);
		} else {
			itemType = 'UNKNOWN';
		}
	});

	function onParsedUpdate(newParsed: Serial) {
		parsed = newParsed;
		updateSerial();
	}

	function addBlock(index: number, token: number, part?: Part) {
		const newBlock: Block = { token };
		if (token === TOK_VARINT || token === TOK_VARBIT) {
			newBlock.value = 0;
		} else if (token === TOK_PART) {
			newBlock.part = part || { subType: SUBTYPE_NONE, index: 0 };
		}
		parsed.splice(index, 0, newBlock);
		parsed = parsed; // Trigger reactivity
		updateSerial();
	}

	function deleteBlock(index: number) {
		parsed.splice(index, 1);
		parsed = parsed; // Trigger reactivity
		updateSerial();
	}

	function updateBlockValue(block: Block, value: number) {
		if (block.token === TOK_VARINT || block.token === TOK_VARBIT) {
			block.value = value;
		}
		updateSerial();
	}

	function updatePartListValue(part: Part, index: number, value: number) {
		if (part.values) {
			part.values[index].value = value;
			updateSerial();
		}
	}

	let dragIndex = $state(-1);
	let isHorizontal = $state(false);

	function handleDragStart(index: number) {
		dragIndex = index;
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		if (dragIndex === -1) return;

		const draggedBlock = parsed[dragIndex];
		parsed.splice(dragIndex, 1);
		parsed.splice(dropIndex, 0, draggedBlock);
		parsed = parsed;
		dragIndex = -1;
		updateSerial();
	}
</script>

<FormGroup label="Serial Input">
	<textarea
		class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		oninput={(e) => onSerialUpdate(e.currentTarget.value)}
		placeholder="Paste serial here..."
	></textarea>
</FormGroup>

<FormGroup label="Paste Deserialized JSON or Custom Format">
	<textarea
		class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		bind:value={pastedContent}
		placeholder="Paste deserialized JSON or Custom Format here..."
	></textarea>
</FormGroup>

{#if parsed.length > 0}
	<div
		class="mt-4 rounded-md border border-gray-300 bg-gray-100 p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
	>
		<p>
			Detected Item Type: <span class="font-semibold text-green-600 dark:text-green-400"
				>{itemType}</span
			>
		</p>
		<select
			onchange={(e) => (itemType = e.currentTarget.value)}
			class="mt-2 rounded-md bg-gray-200 p-2 text-gray-900 dark:bg-gray-700 dark:text-white"
			value={itemType}
		>
			<option value="Unknown">Select Item Type</option>
			<option value="Weapon">Weapon</option>
			<option value="Shield">Shield</option>
			<option value="Grenade">Grenade</option>
			<option value="Repkit">Repkit</option>
			<option value="Heavy Ordnance">Heavy Ordnance</option>
			<option value="Vex Class Mod">Vex Class Mod</option>
			<option value="Rafa Class Mod">Rafa Class Mod</option>
			<option value="Harlowe Class Mod">Harlowe Class Mod</option>
		</select>
	</div>
{/if}

{#if error}
	<div
		class="mt-4 rounded-md border border-red-300 bg-red-100 p-4 text-red-900 dark:border-red-700 dark:bg-red-900 dark:text-red-200"
	>
		<p>{error}</p>
	</div>
{/if}

<div class="mt-4" role="list">
	<div class="mb-2 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Parsed Blocks</h3>
		<button
			onclick={() => (isHorizontal = !isHorizontal)}
			class="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
		>
			{#if isHorizontal}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-6 w-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-6 w-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125A1.125 1.125 0 0 0 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
					/>
				</svg>
			{/if}
		</button>
	</div>

	<AddBlockMenu {partService} {itemType} onAdd={(token, part) => addBlock(0, token, part)} />

	<div
		class="mt-2"
		class:flex={isHorizontal}
		class:flex-wrap={isHorizontal}
		class:gap-2={isHorizontal}
		class:space-y-2={!isHorizontal}
	>
		{#each parsed as block, i (block)}
			<div ondragover={(e) => e.preventDefault()} ondrop={(e) => handleDrop(e, i)} role="listitem">
				<BlockComponent
					{block}
					{partService}
					{itemType}
					onDelete={() => deleteBlock(i)}
					onAddBefore={() => addBlock(i, TOK_SEP1)}
					onAddAfter={() => addBlock(i + 1, TOK_SEP1)}
					onUpdateBlockValue={(value) => updateBlockValue(block, value)}
					onUpdatePart={() => updateSerial()}
					onUpdatePartList={(part, index, value) => updatePartListValue(part, index, value)}
					ondragstart={() => handleDragStart(i)}
				/>
			</div>
		{/each}
	</div>

	<AddBlockMenu
		{partService}
		{itemType}
		onAdd={(token, part) => addBlock(parsed.length, token, part)}
	/>
</div>
