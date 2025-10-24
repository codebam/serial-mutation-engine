<script lang="ts">
	let { message, show } = $props<{
		message: string;
		show: boolean;
	}>();
</script>

{#if show}
	<div class="fixed bottom-4 right-4 rounded-md bg-gray-800 p-4 text-white">
		{@html message}
	</div>
{/if}
