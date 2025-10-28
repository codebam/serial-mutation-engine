<script lang="ts">
	import { type Serial, type Part, classModIdToName } from '../types.ts';
	import { browser } from '$app/environment';
	import { toCustomFormat } from '../formatter.ts';
	import { parseCustomFormat, customFormatLanguage } from '../custom_format_parser.ts';
	import FormGroup from './FormGroup.svelte';
	import Worker from '$lib/worker/worker.js?worker';
	import { PartService } from '$lib/partService.ts';
	import { TOK_PART } from '../types.ts';
	import { EditorView, keymap } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { defaultKeymap } from '@codemirror/commands';
	import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
	import { tags } from '@lezer/highlight';
	import { SvelteMap } from 'svelte/reactivity';
	import { theme } from '$lib/stores/themeStore'; // Import the theme store

	const lightHighlightStyle = HighlightStyle.define([
		{ tag: tags.number, color: 'var(--color-light-foreground)' },
		{ tag: tags.operator, color: 'var(--color-light-blue)' },
		{ tag: tags.bracket, color: 'var(--color-light-primary)' }
	]);

	const darkHighlightStyle = HighlightStyle.define([
		{ tag: tags.number, color: 'var(--color-dark-foreground)' },
		{ tag: tags.operator, color: 'var(--color-dark-blue)' },
		{ tag: tags.bracket, color: 'var(--color-dark-primary)' }
	]);

	let { serial, onCustomFormatOutputUpdate, onSerialUpdate } = $props<{
		serial: string;
		onCustomFormatOutputUpdate?: (newJson: string) => void;
		onSerialUpdate?: (newSerial: string) => void;
	}>();

	let parsed: Serial = $state([]);
	let error: string | null = $state(null);
	let itemType = $state('UNKNOWN');
	let customFormatOutput = $state('');
	let detectedParts: { code: string; name: string }[] = $state([]);
	let baseYaml = $state('');
	let mergedYaml = $state('');
	let fileInput: HTMLInputElement = $state() as HTMLInputElement;
	let useStringRepresentation = $state(false);

	const isMounted = $derived(browser);

	let passiveIdToName: SvelteMap<number, string> = new SvelteMap();
	let weaponPartIdToName: SvelteMap<number, string> = new SvelteMap();

	let editorView: EditorView | null = null; // To store the CodeMirror view instance

	function codemirror(el: HTMLElement, content: string) {
		function createEditor(currentTheme: 'light' | 'dark') {
			const highlightStyle = currentTheme === 'dark' ? darkHighlightStyle : lightHighlightStyle;
			return new EditorView({
				state: EditorState.create({
					doc: content,
					extensions: [
						customFormatLanguage,
						syntaxHighlighting(highlightStyle),
						keymap.of(defaultKeymap),
						EditorView.lineWrapping,
						EditorView.updateListener.of((update) => {
							if (update.docChanged) {
								onCustomFormatUpdate(update.state.doc.toString());
							}
						})
					]
				}),
				parent: el
			});
		}

		// Initialize editor on mount
		editorView = createEditor($theme);

		// Reactive effect to update editor when theme changes
		$effect(() => {
			if (editorView) {
				editorView.destroy(); // Destroy old view
			}
			editorView = createEditor($theme); // Create new view with updated theme
		});

		return {
			update(newContent: string) {
				if (editorView && newContent !== editorView.state.doc.toString()) {
					editorView.dispatch({
						changes: { from: 0, to: editorView.state.doc.length, insert: newContent }
					});
				}
			},
			destroy() {
				editorView?.destroy();
				editorView = null;
			}
		};
	}

	const dataLoaded = $derived.by(async () => {
		if (itemType.includes('Class Mod')) {
			const response = await fetch('/passives.json');
			const passives: Record<string, { id: string } | string> = await response.json();
			const newPassives = new SvelteMap<number, string>();
			for (const key in passives) {
				const passive = passives[key];
				if (typeof passive === 'object') {
					newPassives.set(parseInt(passive.id), key);
				} else {
					newPassives.set(parseInt(passive), key);
				}
			}
			passiveIdToName = newPassives;
			return { passivesLoaded: true, weaponPartsLoaded: false };
		} else if (itemType.includes('Weapon')) {
			const [womboComboResponse, universalResponse] = await Promise.all([
				fetch('/wombo_combo_parts.json'),
				fetch('/universal_weapon_parts.json')
			]);
			const womboComboParts: Record<string, { id: string } | string> =
				await womboComboResponse.json();
			const universalParts: Record<string, { id: string } | string> =
				await universalResponse.json();

			const combinedParts = { ...womboComboParts, ...universalParts };

			const newWeaponParts = new SvelteMap<number, string>();
			for (const key in combinedParts) {
				const part = combinedParts[key];
				if (typeof part === 'object') {
					newWeaponParts.set(parseInt(part.id), key);
				} else {
					newWeaponParts.set(parseInt(part), key);
				}
			}
			weaponPartIdToName = newWeaponParts;
			return { passivesLoaded: false, weaponPartsLoaded: true };
		}
		return { passivesLoaded: false, weaponPartsLoaded: false };
	});

	function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
		let timeout: ReturnType<typeof setTimeout>;

		return ((...args: unknown[]) => {
			clearTimeout(timeout);

			timeout = setTimeout(() => func(...args), wait);
		}) as T;
	}

	function handleUseStringRepresentationChange() {
		customFormatOutput = toCustomFormat(
			parsed,
			useStringRepresentation,
			Object.fromEntries(passiveIdToName),
			classModIdToName,
			Object.fromEntries(weaponPartIdToName),
			itemType
		);
	}

	$effect(() => {
		// When the parsed serial changes, update the custom format output and the detected parts.
		console.log('Effect: parsed changed', $state.snapshot(parsed));
		if (parsed) {
			customFormatOutput = toCustomFormat(
				parsed,
				useStringRepresentation,
				Object.fromEntries(passiveIdToName),
				classModIdToName,
				Object.fromEntries(weaponPartIdToName),
				itemType
			);
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
		console.log(Worker);
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

				// Update the custom format output
				customFormatOutput = toCustomFormat(
					parsed,
					useStringRepresentation,
					Object.fromEntries(passiveIdToName),
					classModIdToName,
					Object.fromEntries(weaponPartIdToName),
					itemType
				);
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

	const debouncedValidate = debounce(validate, 500);

	function onCustomFormatUpdate(newValue: string) {
		customFormatOutput = newValue;
		debouncedValidate();
	}

	function validate() {
		(async () => {
			try {
				const passives = Object.fromEntries(
					Array.from(passiveIdToName.entries()).map(([id, name]) => [name, { id }])
				);
				const newParsed = await parseCustomFormat(customFormatOutput, passives);
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
		})();
	}

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
		if (onSerialUpdate) {
			onSerialUpdate(serial);
		}
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
			class="min-h-[80px] w-full rounded-md border border-light-surface p-3 font-mono text-sm text-light-foreground outline-none focus:border-light-blue focus:ring-2 focus:ring-light-blue dark:border-dark-surface dark:text-dark-foreground dark:focus:border-dark-blue dark:focus:ring-dark-blue"
			bind:value={serial}
			placeholder="Paste serial here..."
		></textarea>
	</FormGroup>

	{#if isMounted && detectedParts.length > 0}
		<FormGroup label="Detected Parts">
			<ul class="list-inside list-disc text-sm text-light-foreground dark:text-dark-foreground">
				{#each detectedParts as part (part.code)}
					<li>{part.code} - {part.name}</li>
				{/each}
			</ul>
		</FormGroup>
	{/if}

	<FormGroup label="Detected Item Type">
		<p>
			<span class="font-semibold text-light-green dark:text-dark-green">
				{itemType}
			</span>
		</p>
		<select
			onchange={(e) => (itemType = e.currentTarget.value)}
			class="mt-2 rounded-md bg-light-background p-2 text-light-foreground dark:bg-dark-surface dark:text-dark-foreground"
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
			<option value="Amon Class Mod">Amon Class Mod</option>
		</select>
	</FormGroup>
	<FormGroup label="Deserialized Output">
		<div class="mb-2 flex justify-end">
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={useStringRepresentation}
					onchange={handleUseStringRepresentationChange}
					disabled={!dataLoaded}
				/>
				<span class="ml-2 text-sm text-light-primary">Use String Representation</span>
			</label>
		</div>
		<div
			use:codemirror={customFormatOutput}
			class="min-h-[80px] rounded-md border border-light-surface bg-transparent dark:border-dark-surface"
		></div>
	</FormGroup>
	{#if error}
		<div
			class="mt-4 rounded-md border border-light-red bg-light-red/20 p-4 text-light-red dark:border-dark-red dark:bg-dark-red/20 dark:text-dark-red"
		>
			<p>{error}</p>
		</div>
	{/if}

	{#if isMounted}
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
				class="rounded-md bg-light-background px-4 py-2 text-center text-sm font-medium text-light-foreground transition-all hover:bg-light-surface dark:bg-dark-surface dark:text-dark-foreground dark:hover:bg-dark-dark-blue"
			>
				Select YAML to Merge
			</button>
			<button
				onclick={mergeAndDownloadYaml}
				disabled={!baseYaml}
				class="rounded-md bg-light-background px-4 py-2 text-center text-sm font-medium text-light-foreground transition-all hover:bg-light-surface disabled:text-light-primary dark:bg-dark-surface dark:text-dark-foreground dark:hover:bg-dark-dark-blue"
			>
				Merge
			</button>
		</div>
	{/if}
</div>
