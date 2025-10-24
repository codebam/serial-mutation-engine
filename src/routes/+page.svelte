<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';
	import BitstreamMatrix from '../lib/components/BitstreamMatrix.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { onMount } from 'svelte';

	let serialEditors = $state([
		{
			id: 1,
			serial: '',
			jsonOutput: '', // Add jsonOutput to the state
			merged: false
		}
	]);

	let showToast = $state(false);
	let toastMessage = $state('');

	let bits = $state<number[]>([]);
	let worker: Worker;

	onMount(() => {
		worker = new Worker(new URL('../lib/worker/worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.onmessage = (e: MessageEvent) => {
			if (e.data.type === 'bit_stream_update') {
				bits.push(e.data.payload);
				bits = bits;
			}
		};

		return () => {
			worker.terminate();
		};
	});

	function updateEditorSerial(editorId: number, newSerial: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.serial = newSerial;
			editor.merged = false;
			if (worker) {
				worker.postMessage({ type: 'parse_serial', payload: newSerial });
			}
		}
	}

	function updateEditorCustomFormatOutput(editorId: number, newJson: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.jsonOutput = newJson;
		}
	}

	function copyJson() {
		const json = serialEditors[0].jsonOutput; // Assuming only one editor for now
		navigator.clipboard.writeText(json);
		toastMessage =
			'did you know we have an <a href="/docs" class="underline">API documentation</a>?';
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 5000);
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col gap-4">
	<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
		{#each serialEditors as editor (editor.id)}
			<div>
				<SerialEditor
					serial={editor.serial}
					onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)}
					onCustomFormatOutputUpdate={(newJson) =>
						updateEditorCustomFormatOutput(editor.id, newJson)
					}
				/>
			</div>
		{/each}
		<div>
			<BitstreamMatrix bits={bits} />
		</div>
	</div>
</main>

<div class="fixed right-4 bottom-4 flex flex-col gap-2">
	<button onclick={copyJson} class="text-sm text-gray-500">JSON</button>
</div>

<Toast message={toastMessage} show={showToast} />
