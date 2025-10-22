<script lang="ts">
    import type { Part } from '$lib/types';
    import type { PartService } from '$lib/partService';

    let { part, partService } = $props<{
        part: Part;
        partService: PartService;
    }>();

    let partName = $derived(partService.findPartName(part));
</script>

{#if partName}
    <span class="text-sm text-gray-400 ml-2">({partName})</span>
{/if}
