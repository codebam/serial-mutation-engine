
<script lang="ts">
    import type { Serial, Block, Part } from '$lib/types';
    import { toCustomFormat, parseCustomFormat } from '$lib/custom_parser';

    let { parsed, onParsedUpdate } = $props<{
        parsed: Serial;
        onParsedUpdate: (newParsed: Serial) => void;
    }>();

    let jsonString = $state(JSON.stringify(parsed, null, 2));
    let customString = $state(toCustomFormat(parsed));

    $effect(() => {
        jsonString = JSON.stringify(parsed, null, 2);
        customString = toCustomFormat(parsed);
    });

    function updateParsedFromJson() {
        try {
            const newParsed = JSON.parse(jsonString);
            onParsedUpdate(newParsed);
        } catch (e) {
            console.error("Invalid JSON", e);
        }
    }

    function updateParsedFromCustom() {
        try {
            const newParsed = parseCustomFormat(customString);
            onParsedUpdate(newParsed);
        } catch (e) {
            console.error("Invalid custom format", e);
        }
    }

</script>

<div class="mt-4 space-y-2">
    <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
        <div class="flex justify-between items-center">
            <h4 class="font-semibold">Deserialized</h4>
            <div>
                <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all mr-2" onclick={updateParsedFromCustom}>Apply</button>
                <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition-all" onclick={() => navigator.clipboard.writeText(customString)}>Copy</button>
            </div>
        </div>
        <textarea class="text-xs text-gray-300 bg-gray-900 p-2 rounded-md mt-2 w-full h-24 font-mono" bind:value={customString}></textarea>
    </div>
    <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
        <div class="flex justify-between items-center">
            <h4 class="font-semibold">JSON</h4>
            <div>
                <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all mr-2" onclick={updateParsedFromJson}>Apply</button>
                <button class="py-1 px-3 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition-all" onclick={() => navigator.clipboard.writeText(jsonString)}>Copy</button>
            </div>
        </div>
        <textarea class="text-xs text-gray-300 bg-gray-900 p-2 rounded-md mt-2 w-full h-48 font-mono" bind:value={jsonString}></textarea>
    </div>
</div>
