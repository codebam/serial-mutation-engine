<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';

	import { Button, ToastNotification } from 'carbon-components-svelte';
	import { Copy } from 'carbon-icons-svelte';

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

	function copyJson() {
		const json = serialEditors[0].jsonOutput; // Assuming only one editor for now
		navigator.clipboard.writeText(json);
		toastMessage =
			'did you know we have an <a href="/docs" class="underline">API documentation</a>?';
		showToast = true;
	}

	function updateEditorCustomFormatOutput(editorId: number, newJson: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.jsonOutput = newJson;
		}
	}

	function updateEditorSerial(editorId: number, newSerial: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.serial = newSerial;
		}
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col gap-4">
	{#each serialEditors as editor (editor.id)}
		<div>
			<SerialEditor
				serial={editor.serial}
				onCustomFormatOutputUpdate={(newJson) => updateEditorCustomFormatOutput(editor.id, newJson)}
				onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)}
			/>
		</div>
	{/each}
</main>

<div class="fixed right-4 bottom-4 flex flex-col gap-2">
	<Button on:click={copyJson} icon={Copy} iconDescription="Copy JSON" hideTooltip={true} />
</div>

<div style="position: fixed; top: 1rem; right: 1rem; z-index: 9999;">
	{#if showToast}
		<ToastNotification
			kind="info"
			title="Copied to clipboard"
			caption={new Date().toLocaleTimeString()}
			timeout={5000}
		>
			<div slot="subtitle">{toastMessage}</div>
		</ToastNotification>
	{/if}
</div>
