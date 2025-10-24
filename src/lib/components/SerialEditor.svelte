<script lang="ts">
	import type { Serial, Block, TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, SUBTYPE_NONE  } from '$lib/types.js';
	import { toCustomFormat, parseCustomFormat } from '../custom_parser';
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
	let jsonOutput = $state('');

	let debounceTimeout: number;

	$effect(() => {
		console.log('Effect: parsed changed', parsed);
		if (parsed) {
			jsonOutput = toCustomFormat(parsed);
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
			console.log('Worker message received:', type, payload);
			if (type === 'parsed_serial') {
				if (payload.parsed) {
					parsed = payload.parsed;
				} else {
					parsed = [];
				}
				itemType = partService.determineItemType(payload.parsed);
				error = payload.error;
			} else if (type === 'encoded_serial') {
				console.log('Encoded serial from worker:', payload.serial);
				if (payload.serial !== serial) {
					onSerialUpdate(payload.serial);
				}
				error = payload.error;
			}
		};
	}

	function analyzeSerial() {
		console.log('analyzeSerial called. Current serial:', serial);
		if (!serial && parsed.length > 0) {
			parsed = [];
			error = null;
			return;
		}
		if (worker) {
			console.log('Posting parse_serial message to worker with payload:', serial);
			worker.postMessage({ type: 'parse_serial', payload: serial });
		}
	}

	function debounceParse(callback: () => void) {
		console.log('debounceParse called for:', callback.name);
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			console.log('Debounced function executed:', callback.name);
			callback();
		}, 3000);
	}

	$effect(() => {
		console.log('Effect: serial changed, debouncing analyzeSerial');
		debounceParse(analyzeSerial);
	});

	$effect(() => {
		console.log('Effect: parsed changed for itemType detection', parsed);
		if (parsed && parsed.length > 0) {
			itemType = partService.determineItemType(parsed);
		} else {
			itemType = 'UNKNOWN';
		}
	});

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

	function onJsonOutputChange(e: Event) {
		const newJson = (e.target as HTMLTextAreaElement).value;
		console.log('onJsonOutputChange called. New Custom Format:', newJson);
		jsonOutput = newJson;
		debounceParse(() => {
			console.log('Attempting to parse custom format from onJsonOutputChange');
			try {
				const newParsed = parseCustomFormat(newJson);
				if (newParsed) {
					parsed = newParsed;
					updateSerial();
					error = null;
				} else {
					error = 'Invalid Custom Format';
				}
			} catch (err) {
				console.error('Error parsing custom format from onJsonOutputChange:', err);
				if (err instanceof Error) {
					error = err.message;
				} else {
					error = 'An unknown error occurred while parsing the custom format.';
				}
			}
		});
	}
</script>

<FormGroup label="Serial Input">
	<textarea
		class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		oninput={(e) => onSerialUpdate(e.currentTarget.value)}
		placeholder="Paste serial here..."
	>{serial}</textarea>
</FormGroup>

{#if parsed && parsed.length > 0}
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

<FormGroup label="Deserialized Output">
	<textarea
		class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
		bind:value={jsonOutput}
		oninput={onJsonOutputChange}
		placeholder="Paste deserialized here..."
	></textarea>
</FormGroup>


{#if error}
	<div
		class="mt-4 rounded-md border border-red-300 bg-red-100 p-4 text-red-900 dark:border-red-700 dark:bg-red-900 dark:text-red-200"
	>
		<p>{error}</p>
	</div>
{/if}

<div class="mt-4" role="list">


	<AddBlockMenu
		{partService}
		{itemType}
		onAdd={(token, part) => addBlock(parsed.length, token, part)}
	/>
</div>
