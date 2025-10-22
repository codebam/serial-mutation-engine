
<script lang="ts">
	let { value, onUpdate, onDelete, color = 'bg-gray-100', isVarInt = false, bitSize = 6, selected = false, onClick = () => {} } = $props<{
		value: number;
		onUpdate: (newValue: number) => void;
        onDelete?: () => void;
		color?: string;
        isVarInt?: boolean;
        bitSize?: number;
        selected?: boolean;
        onClick?: () => void;
	}>();

	let localValue = $state(value.toString(10));
    let snapshot = value;

	$effect(() => {
        if (value !== snapshot) {
            localValue = value.toString(10);
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
        } else if (!isVarInt && newValue >= (1 << bitSize)) {
            newValue = (1 << bitSize) - 1;
        }

        localValue = newValue.toString(10);

		if (onUpdate) {
			onUpdate(newValue);
		}
	}

    function handleDelete(event: MouseEvent) {
        event.preventDefault();
        if (onDelete) {
            onDelete();
        }
    }

</script>

<input
	type="text"
	bind:value={localValue}
	onchange={handleChange}
    oncontextmenu={handleDelete}
    onclick={onClick}
	class={`border p-2.5 cursor-move min-w-[40px] text-center ${color} text-black w-16 rounded-md ${selected ? 'border-blue-500' : 'border-gray-300'}`}
/>

