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
		let newValue = parseInt(localValue, 10);

        if (isNaN(newValue)) {
            newValue = 0;
        }

        if (newValue < 0) {
            newValue = 0;
        } else if (newValue > 63) {
            newValue = 63;
        }

        localValue = newValue.toString();

		if (onUpdate) {
			onUpdate(newValue);
		}
	}

</script>

<input
	type="text"
	bind:value={localValue}
	onchange={handleChange}
	class={`border border-gray-300 p-2.5 cursor-move min-w-[40px] text-center ${color} text-black w-16 rounded-md`}
/>