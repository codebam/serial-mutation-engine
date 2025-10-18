<script lang="ts">
	let { value, onUpdate, color = 'bg-gray-100' } = $props<{
		value: number;
		onUpdate: (newValue: number) => void;
		color?: string;
	}>();

	let localValue = $state(value.toString());
    let snapshot = value;

	$effect(() => {
        if (value !== snapshot) {
            localValue = value.toString();
            snapshot = value;
        }
	});

	function handleChange() {
		const newValue = parseInt(localValue, 10);
		if (!isNaN(newValue)) {
			if (onUpdate) {
				onUpdate(newValue);
			}
		} else {
            if (onUpdate) {
                onUpdate(0);
            }
        }
	}

</script>

<input
	type="text"
	bind:value={localValue}
	onchange={handleChange}
	class={`border border-gray-300 p-2.5 cursor-move min-w-[40px] text-center ${color} text-black w-16 rounded-md`}
/>