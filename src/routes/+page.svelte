<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';

	import { Button } from 'carbon-components-svelte';
	import { Copy } from 'carbon-icons-svelte';

	let serialEditors = $state([
		{
			id: 1,
			serial: '',
			jsonOutput: '', // Add jsonOutput to the state
			merged: false
		}
	]);

	function copyJson() {
		const json = serialEditors[0].jsonOutput; // Assuming only one editor for now
		navigator.clipboard.writeText(json);
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

<svelte:head>
	<title>Borderlands 4 Serial Mutation Engine</title>
</svelte:head>

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
