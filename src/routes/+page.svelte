<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';
	import Toast from '$lib/components/Toast.svelte';

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

	function updateEditorSerial(editorId: number, newSerial: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.serial = newSerial;
			editor.merged = false;
		}
	}

	function updateEditorJsonOutput(editorId: number, newJson: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.jsonOutput = newJson;
		}
	}

	function copyJson() {
		const json = serialEditors[0].jsonOutput; // Assuming only one editor for now
		navigator.clipboard.writeText(json);
		toastMessage = 'did you know we have an <a href="/api" class="underline">API</a>?';
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col gap-4">
	{#each serialEditors as editor (editor.id)}
		<div>
			<SerialEditor
				serial={editor.serial}
				onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)}
				onJsonOutputUpdate={(newJson) => updateEditorJsonOutput(editor.id, newJson)}
			/>
		</div>
	{/each}
</main>

<div class="fixed right-4 bottom-4">
	<button onclick={copyJson} class="text-sm text-gray-500">JSON</button>
</div>

<Toast message={toastMessage} show={showToast} />
