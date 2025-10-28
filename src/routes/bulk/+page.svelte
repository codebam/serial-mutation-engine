<script lang="ts">
	import { onMount } from 'svelte';
	import FormGroup from '../../lib/components/FormGroup.svelte';
	import { FileUploader } from 'carbon-components-svelte';

	let worker: Worker;
	let processingSerials = false;
	let processingCustomFormats = false;

	onMount(() => {
		worker = new Worker(new URL('$lib/worker/worker.ts', import.meta.url), { type: 'module' });

		worker.onmessage = (_e) => {
			if (_e.data.type === 'parsed_serials_to_custom_format') {
				const customFormats = _e.data.payload.customFormats;
				const json = JSON.stringify(customFormats, null, 2);
				const blob = new Blob([json], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'deserialized.json';
				a.click();
				URL.revokeObjectURL(url);
				processingSerials = false;
			} else if (_e.data.type === 'parsed_custom_formats_to_serials') {
				const serials = _e.data.payload.serials;
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

	async function processSerialsFile(event: CustomEvent) {
		const file = event.detail.acceptedFiles[0];
		if (!file) {
			return;
		}

		processingSerials = true;
		const text = await file.text();
		const serials = text.split('\n').filter((s: string) => s.length > 0);

		worker.postMessage({ type: 'parse_serials_to_custom_format', payload: serials });
	}

	async function processCustomFormatsFile(event: CustomEvent) {
		const file = event.detail.acceptedFiles[0];
		if (!file) {
			return;
		}

		processingCustomFormats = true;
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
			} catch (_e) {
				alert(`Error parsing JSON file: ${(_e as Error).message}`);
				processingCustomFormats = false;
				return;
			}
		} else {
			customFormats = text.split('\n').filter((s: string) => s.length > 0);
		}

		worker.postMessage({ type: 'parse_custom_formats_to_serials', payload: customFormats });
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col items-center gap-4">
	<FormGroup legendText="Bulk Serial Processor">
		<FileUploader
			buttonLabel="Select serials.txt to Process"
			accept={['.txt']}
			on:change={processSerialsFile}
			disabled={processingSerials}
		/>
	</FormGroup>

	<FormGroup legendText="Bulk Deserialized Processor">
		<FileUploader
			buttonLabel="Select deserialized.json or .txt to Process"
			accept={['.json', '.txt']}
			on:change={processCustomFormatsFile}
			disabled={processingCustomFormats}
		/>
	</FormGroup>
</main>
