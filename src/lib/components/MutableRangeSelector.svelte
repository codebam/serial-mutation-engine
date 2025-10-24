<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FormGroup from './FormGroup.svelte';

	let {
		seed = $bindable(),
		start = $bindable(),
		end = $bindable(),
		inputClasses,
		isMerging
	} = $props();

	let lastSeed = $state(seed);
	$effect(() => {
		if (seed !== lastSeed) {
			start = seed.length;
			end = seed.length;
			lastSeed = seed;
		}
	});

	const dispatch = createEventDispatcher();

	function handleRangeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const { name, value } = target;
		let intValue = parseInt(value, 10);
		if (isNaN(intValue)) intValue = name === 'start' ? start : end;

		let newStart = name === 'start' ? intValue : start;
		let newEnd = name === 'end' ? intValue : end;

		if (newStart < 0) newStart = 0;
		if (newEnd > seed.length) newEnd = seed.length;
		if (newStart > newEnd) {
			if (name === 'start') newStart = newEnd;
			else newEnd = newStart;
		}

		start = newStart;
		end = newEnd;

		dispatch('change', { start, end });
	}

	const protectedPrefix = $derived(seed.substring(0, start));
	const mutablePart = $derived(seed.substring(start, end));
	const protectedSuffix = $derived(seed.substring(end));
</script>

<FormGroup label="Mutable Character Range">
	<div class="rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-xs break-all dark:border-gray-700 dark:bg-gray-900">
		<span class="text-gray-500 dark:text-gray-400" title="Protected Prefix">{protectedPrefix}</span><span
			class="rounded-sm bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
			title="Mutable Part">{mutablePart}</span
		><span class="text-gray-500 dark:text-gray-400" title="Protected Suffix">{protectedSuffix}</span>
	</div>
	<div class="mt-4 grid grid-cols-2 gap-4">
		<FormGroup label="Start Index">
			<input
				type="number"
				name="start"
				bind:value={start}
				onchange={handleRangeChange}
				class={inputClasses}
				min="0"
				max={seed.length}
				disabled={isMerging}
			/>
		</FormGroup>
		<FormGroup label="End Index">
			<input
				type="number"
				name="end"
				bind:value={end}
				onchange={handleRangeChange}
				class={inputClasses}
				min="0"
				max={seed.length}
				disabled={isMerging}
			/>
		</FormGroup>
	</div>
</FormGroup>
