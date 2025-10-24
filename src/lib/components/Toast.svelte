<script lang="ts">
	let { message, show } = $props<{
		message: string;
		show: boolean;
	}>();
</script>

{#if show}
	<div class="fixed right-4 bottom-4 rounded-md bg-gray-800 p-4 text-white">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html message}
	</div>
{/if}
