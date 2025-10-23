<script lang="ts">
	import type { Serial } from '$lib/types';
	import { toCustomFormat, parseCustomFormat } from '$lib/custom_parser';

	let { parsed, onParsedUpdate, isMaximized } = $props<{
		parsed: Serial;
		onParsedUpdate: (newParsed: Serial) => void;
		isMaximized: boolean;
	}>();

	let jsonString = $state(JSON.stringify(parsed, null, 2));
	let customString = $state(toCustomFormat(parsed));

	$effect(() => {
		jsonString = JSON.stringify(parsed, null, 2);
		customString = toCustomFormat(parsed);
	});

	function updateParsedFromJson() {
		try {
			const newParsed = JSON.parse(jsonString);
			onParsedUpdate(newParsed);
		} catch (e) {
			console.error('Invalid JSON', e);
		}
	}

	function updateParsedFromCustom() {
		try {
			const newParsed = parseCustomFormat(customString);
			onParsedUpdate(newParsed);
		} catch (e) {
			console.error('Invalid custom format', e);
		}
	}
</script>

<div class="mt-4" class:flex={isMaximized} class:gap-2={isMaximized} class:space-y-2={!isMaximized}>
	<div class="rounded-md border border-gray-700 bg-gray-800 p-4" class:flex-1={isMaximized}>
		<div class="flex items-center justify-between">
			<h4 class="font-semibold">Deserialized</h4>
			<div>
				<button
					class="mr-2 rounded-md bg-blue-700 px-3 py-1 text-sm font-medium text-gray-300 transition-all hover:bg-blue-600"
					onclick={updateParsedFromCustom}>Apply</button
				>
				<button
					class="rounded-md bg-gray-600 px-3 py-1 text-sm font-medium text-gray-300 transition-all hover:bg-gray-500"
					onclick={() => navigator.clipboard.writeText(customString)}>Copy</button
				>
			</div>
		</div>
		<textarea
			class="mt-2 h-24 w-full rounded-md bg-gray-900 p-2 font-mono text-xs text-gray-300"
			bind:value={customString}
		></textarea>
	</div>
	<div class="rounded-md border border-gray-700 bg-gray-800 p-4" class:flex-1={isMaximized}>
		<div class="flex items-center justify-between">
			<h4 class="font-semibold">JSON</h4>
			<div>
				<button
					class="mr-2 rounded-md bg-blue-700 px-3 py-1 text-sm font-medium text-gray-300 transition-all hover:bg-blue-600"
					onclick={updateParsedFromJson}>Apply</button
				>
				<button
					class="rounded-md bg-gray-600 px-3 py-1 text-sm font-medium text-gray-300 transition-all hover:bg-gray-500"
					onclick={() => navigator.clipboard.writeText(jsonString)}>Copy</button
				>
			</div>
		</div>
		<textarea
			class="mt-2 h-48 w-full rounded-md bg-gray-900 p-2 font-mono text-xs text-gray-300"
			bind:value={jsonString}
		></textarea>
	</div>
</div>
