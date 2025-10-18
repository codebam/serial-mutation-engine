<script lang="ts">
	export let value: number;
	export let onUpdate: (newValue: number) => void;
	export let color: string = 'bg-gray-100'; // Default color

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		const newValue = parseInt(target.textContent || '0', 10);
		if (!isNaN(newValue)) {
			if (onUpdate) {
				onUpdate(newValue);
			}
		} else {
			target.textContent = '0';
			if (onUpdate) {
				onUpdate(0);
			}
		}
	}
</script>

<div
	contenteditable="true"
	oninput={handleInput}
	class={`border border-gray-300 p-2.5 cursor-move min-w-[40px] text-center ${color} text-black`}
>
	{value}
</div>