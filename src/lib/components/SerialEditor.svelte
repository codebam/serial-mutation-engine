<script lang="ts">
	import {
		type Serial,
		type Block,
		TOK_VARINT,
		TOK_VARBIT,
		TOK_PART,
		SUBTYPE_NONE,
		type Part
	} from '$lib/types.js';
	import { toCustomFormat, parseCustomFormat, togglePassiveName } from '../custom_parser.js';
	import FormGroup from './FormGroup.svelte';

	let showPassiveName = $state(false);

	function handleShowPassiveNameChange() {
		togglePassiveName(showPassiveName);
		customFormatOutput = toCustomFormat(parsed);
	}

	import { browser } from '$app/environment';
	import { PartService } from '$lib/partService.js';
	import Worker from '$lib/worker/worker.js?worker';
	import { parseSerial, encodeSerial } from '$lib/api.js';

	// Add new functions for direct parsing/encoding
	function parseSerialDirect() {
		try {
			const newParsed = parseSerial(serial);
			parsed = newParsed;
			error = null;
			customFormatOutput = toCustomFormat(parsed); // Manually update output
		} catch (err) {
			console.error('Direct parse error:', err);
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred during direct parsing.';
			}
		}
	}

	function encodeSerialDirect() {
		try {
			const newSerial = encodeSerial(parsed);
			serial = newSerial;
			error = null;
		} catch (err) {
			console.error('Direct encode error:', err);
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'An unknown error occurred during direct encoding.';
			}
		}
	}

	let { serial, onCustomFormatOutputUpdate } = $props<{
		serial: string;
		onCustomFormatOutputUpdate?: (newJson: string) => void;
	}>();
	let parsed: Serial = $state([]);
	let error: string | null = $state(null);
	let itemType = $state('UNKNOWN');
	let customFormatOutput = $state('');
	let baseYaml = $state('');
	let mergedYaml = $state('');
	let fileInput: HTMLInputElement;
	let detectedParts: { code: string; name: string }[] = $state([]);

	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		console.log('Effect: parsed changed', $state.snapshot(parsed));
		if (parsed) {
			customFormatOutput = toCustomFormat(parsed);
			if (onCustomFormatOutputUpdate) {
				onCustomFormatOutputUpdate(JSON.stringify(parsed, null, 2));
			}

			// Update detected parts
			const newDetectedParts: { code: string; name: string }[] = [];
			for (const block of parsed) {
				if (block.token === TOK_PART && block.part) {
					const partInfo = partService.findPartInfo(block.part);
					if (partInfo) {
						newDetectedParts.push({
							code: partInfo.code,
							name: partInfo.name
						});
					}
				}
			}
			detectedParts = newDetectedParts;
		}
	});

	class DummyPartService {
		loadPartData() {
			return Promise.resolve();
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		findPartInfo(part: Part) {
			return null;
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		getParts(itemType: string) {
			return [];
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		determineItemType(parsed: Serial) {
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
				console.log('Main thread: Received encoded_serial from worker. Payload:', payload);
				if (payload.serial !== serial) {
					serial = payload.serial;
				}
				error = payload.error;
			} else if (type === 'merged_yaml') {
				mergedYaml = payload.yaml;
				downloadYaml();
			}
		};
	}

	function analyzeSerial(currentSerial: string) {
		console.log('analyzeSerial called. Current serial:', currentSerial);
		if (!currentSerial) {
			console.log('analyzeSerial: currentSerial is empty, returning early.');
			parsed = [];
			error = null;
			detectedParts = [];
			return;
		}
		if (worker) {
			console.log('Posting parse_serial message to worker with payload:', currentSerial);
			worker.postMessage({ type: 'parse_serial', payload: currentSerial });
		} else {
			console.log('analyzeSerial: Worker is not initialized.');
		}
	}

	$effect(() => {
		console.log('Effect: serial changed, analyzing serial');
		analyzeSerial(serial);
	});

	$effect(() => {
		const currentCustomFormat = toCustomFormat(parsed);
		if (customFormatOutput !== currentCustomFormat) {
			try {
				const newParsed = parseCustomFormat(customFormatOutput);
				if (newParsed) {
					parsed = newParsed;
					updateSerial();
					error = null;
				} else {
					if (customFormatOutput.trim() !== '') {
						error = 'Invalid Custom Format';
					} else {
						error = null;
						parsed = [];
						updateSerial();
					}
				}
			} catch (err) {
				console.error('Error parsing custom format:', err);
				if (err instanceof Error) {
					error = err.message;
				} else {
					error = 'An unknown error occurred while parsing the custom format.';
				}
			}
		}
	});

	$effect(() => {
		console.log('Effect: parsed changed for itemType detection', $state.snapshot(parsed));
		if (parsed && parsed.length > 0) {
			itemType = partService.determineItemType(parsed);
		} else {
			itemType = 'UNKNOWN';
		}
	});

	function updateSerial() {
		if (worker) {
			const plainParsed = JSON.parse(JSON.stringify(parsed));
			console.log('Posting encode_serial message to worker with payload:', plainParsed);
			worker.postMessage({ type: 'encode_serial', payload: plainParsed });
		}
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

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				baseYaml = e.target?.result as string;
				mergedYaml = ''; // Reset merged yaml when new file is selected
			};
			reader.readAsText(file);
		}
	}

	function mergeAndDownloadYaml() {
		if (mergedYaml) {
			downloadYaml();
		} else if (worker) {
			worker.postMessage({ type: 'merge_yaml', payload: { baseYaml, serials: [serial] } });
		}
	}

	function downloadYaml() {
		const blob = new Blob([mergedYaml], { type: 'text/yaml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'merged.yaml';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="mx-2 my-2 md:mx-0 md:my-0">
	<FormGroup label="Serial Input">
		<textarea
			class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
			bind:value={serial}
			placeholder="Paste serial here..."
		></textarea>
	</FormGroup>

	{#if detectedParts.length > 0}
		<FormGroup label="Detected Parts">
			<ul class="list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
				{#each detectedParts as part (part.code)}
					<li>{part.code} - {part.name}</li>
				{/each}
			</ul>
		</FormGroup>
	{/if}

	<FormGroup label="Detected Item Type">
		<p>
			<span class="font-semibold text-green-600 dark:text-green-400">
				{itemType}
			</span>
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
	</FormGroup>
    <FormGroup label="Deserialized Output">
        <div class="flex justify-end mb-2">
            <label class="flex items-center">
                <input type="checkbox" bind:checked={showPassiveName} onchange={handleShowPassiveNameChange} />
                <span class="ml-2 text-sm text-gray-500">Show Strings</span>
            </label>
        </div>
        <textarea
            class="min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            bind:value={customFormatOutput}
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

	<div class="mt-4">
		<input
			type="file"
			onchange={handleFileSelect}
			accept=".yaml,.yml"
			class="hidden"
			bind:this={fileInput}
		/>
		<button
			onclick={() => fileInput.click()}
			class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
		>
			Select YAML to Merge
		</button>
		<button
			onclick={mergeAndDownloadYaml}
			disabled={!baseYaml}
			class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 disabled:text-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
		>
			Merge
		</button>
	</div>
</div>
