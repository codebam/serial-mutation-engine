<script lang="ts">
	import type { Part } from '$lib/types';
	import type { PartService } from '$lib/partService';

	let { part, partService } = $props<{
		part: Part;
		partService: PartService;
	}>();

	let partInfo = $derived(partService.isDataLoaded ? partService.findPartInfo(part) : undefined);
</script>

{#if partInfo && partInfo.name}
	<span class="ml-2 text-sm text-gray-400">({partInfo.name})</span>
{/if}
