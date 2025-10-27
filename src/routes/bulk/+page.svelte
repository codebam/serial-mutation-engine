<script lang="ts">
	import { onMount } from 'svelte';
	import FormGroup from '../../lib/components/FormGroup.svelte';

	let worker: Worker;
	let processingSerials = false;
	let processingCustomFormats = false;
	let serialsFileInput: HTMLInputElement;
	let customFormatsFileInput: HTMLInputElement;

	onMount(() => {
		worker = new Worker(new URL('$lib/worker/worker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (e) => {
			if (e.data.type === 'parsed_serials_to_custom_format') {
				const customFormats = e.data.payload.customFormats;
				const json = JSON.stringify(customFormats, null, 2);
				const blob = new Blob([json], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'deserialized.json';
				a.click();
				URL.revokeObjectURL(url);
				processingSerials = false;
			} else if (e.data.type === 'parsed_custom_formats_to_serials') {
				const serials = e.data.payload.serials;
				const text = serials.join('\n');
				const blob = new Blob([text], { type: 'text/plain' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'serials.txt';
				a.click();
				URL.revokeObjectURL(url);
				processingCustomFormats = false;
			}
		};

		return () => {
			worker.terminate();
		};
	});

	async function processSerialsFile(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) {
			return;
		}

		processingSerials = true;
		const file = input.files[0];
		const text = await file.text();
		const serials = text.split('\n').filter((s) => s.length > 0);

		worker.postMessage({ type: 'parse_serials_to_custom_format', payload: serials });
	}

	async function processCustomFormatsFile(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) {
			return;
		}

		processingCustomFormats = true;
		const file = input.files[0];
		const text = await file.text();
		let customFormats: string[] = [];

		if (file.name.endsWith('.json')) {
			try {
				const parsedJson = JSON.parse(text);
				if (Array.isArray(parsedJson) && parsedJson.every((item) => typeof item === 'string')) {
					customFormats = parsedJson;
				} else {
					alert('Invalid JSON format. Expected an array of strings.');
					processingCustomFormats = false;
					return;
				}
			} catch (e) {
				alert('Error parsing JSON file.');
				processingCustomFormats = false;
				return;
			}
		} else {
			customFormats = text.split('\n').filter((s) => s.length > 0);
		}

		worker.postMessage({ type: 'parse_custom_formats_to_serials', payload: customFormats });
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col items-center gap-4">
	<FormGroup label="Bulk Serial Processor">
		<input
			type="file"
			onchange={processSerialsFile}
			accept=".txt"
			class="hidden"
			bind:this={serialsFileInput}
		/>
		<button
			onclick={() => serialsFileInput.click()}
			class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			disabled={processingSerials}
		>
			{#if processingSerials}Processing...{:else}Select serials.txt to Process{/if}
		</button>
	</FormGroup>

	<FormGroup label="Bulk Deserialized Processor">
		<input
			type="file"
			onchange={processCustomFormatsFile}
			accept=".json,.txt"
			class="hidden"
			bind:this={customFormatsFileInput}
		/>
		<button
			onclick={() => customFormatsFileInput.click()}
			class="rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-900 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			disabled={processingCustomFormats}
		>
			{#if processingCustomFormats}Processing...{:else}Select deserialized.json or .txt to Process{/if}
		</button>
	</FormGroup>
</main>
