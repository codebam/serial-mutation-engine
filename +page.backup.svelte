<script lang="ts">
	import SerialEditor from '../lib/components/SerialEditor.svelte';
	import BitstreamMatrix from '../lib/components/BitstreamMatrix.svelte';
	import { onMount } from 'svelte';

	let serial = $state('');
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
</script>

<svelte:head>
	<title>Serial Mutation Engine</title>
	<meta name="description" content="A universal serial generator and editor" />
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-4xl font-bold">Universal Serial Generator</h1>

	<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
		<div>
			<SerialEditor bind:serial />
		</div>
		<div>
			<BitstreamMatrix bits={bits} />
		</div>
	</div>
</div>
