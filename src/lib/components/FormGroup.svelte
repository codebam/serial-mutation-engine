<script lang="ts">
	let { label, children } = $props();
	const id = `form-group-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex flex-col gap-2">
	<label for={id} class="text-sm font-medium text-gray-700 dark:text-gray-400">{label}</label>
	<div {id}>
		{@render children()}
	</div>
</div>
