<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';

	let serialEditors = $state([
		{
			id: 1,
			serial: '',
			merged: false
		}
	]);

	function updateEditorSerial(editorId: number, newSerial: string) {
		const editor = serialEditors.find((e) => e.id === editorId);
		if (editor) {
			editor.serial = newSerial;
			editor.merged = false;
		}
	}
</script>

<main class="mx-auto my-8 flex h-full w-full max-w-4xl flex-col gap-4">
	{#each serialEditors as editor (editor.id)}
		<div>
			<SerialEditor
				serial={editor.serial}
				onSerialUpdate={(newSerial) => updateEditorSerial(editor.id, newSerial)}
			/>
		</div>
	{/each}
</main>
