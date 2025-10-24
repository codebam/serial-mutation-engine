<script lang="ts">
	import SerialEditor from '$lib/components/SerialEditor.svelte';
	import { page } from '$app/stores';

	interface SerialEditorItem {
		id: number;
		serial: string;
		merged: boolean;
	}

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

	let copiedEditorId = $state<number | null>(null);

	$effect(() => {
		const serialFromUrl = $page.url.searchParams.get('serial');
		if (serialFromUrl) {
			if (serialEditors[0]) {
				serialEditors[0].serial = serialFromUrl;
			}
		}
	});

	async function copyUrl(editor: SerialEditorItem) {
		if (!editor.serial) return;
		const url = new URL(window.location.href);
		url.searchParams.set('serial', editor.serial);
		await navigator.clipboard.writeText(url.toString());
		copiedEditorId = editor.id;
		setTimeout(() => {
			copiedEditorId = null;
		}, 2000);
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
