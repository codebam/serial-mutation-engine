<script lang="ts">
	import { getValueColor } from '$lib/colors';
	let {
		value,
		onUpdate,
		onDelete,
		color,
		selected = false,
		onClick = () => {}
	} = $props<{
		value: number;
		onUpdate: (newValue: number) => void;
		onDelete?: () => void;
		color?: string;
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

	const colorClass = color ? color : getValueColor(value);
</script>

<input
	type="text"
	bind:value={localValue}
	onchange={handleChange}
	oncontextmenu={handleDelete}
	onclick={onClick}
	class={`min-w-[40px] cursor-move border p-2.5 text-center ${colorClass} rounded-md text-black ${selected ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
/>
