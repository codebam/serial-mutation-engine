<script lang="ts">
    import { parseSerial } from '$lib/parser';
    import { encodeSerial } from '$lib/encoder';
    import type { Serial, Block, Part } from '$lib/types';
    import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from '$lib/types';
    import FormGroup from './FormGroup.svelte';

    let { serial, onSerialUpdate } = $props<{ serial: string; onSerialUpdate: (newSerial: string) => void; }>();

    let parsed: Serial | null = $state(null);
    let error: string | null = $state(null);

    function analyzeSerial() {
        if (!serial) {
            parsed = null;
            error = null;
            return;
        }
        try {
            parsed = parseSerial(serial);
            error = null;
        } catch (e: any) {
            parsed = null;
            error = e.message;
        }
    }

    function updateSerial() {
        if (parsed) {
            try {
                const newSerial = encodeSerial(parsed);
                onSerialUpdate(newSerial);
            } catch (e: any) {
                error = e.message;
            }
        }
    }

    $effect(() => {
        analyzeSerial();
    });

    function updateBlockValue(block: Block, value: string) {
        block.value = parseInt(value, 10);
        updateSerial();
    }

    function updatePartIndex(part: Part, value: string) {
        part.index = parseInt(value, 10);
        updateSerial();
    }

    function updatePartValue(part: Part, value: string) {
        part.value = parseInt(value, 10);
        updateSerial();
    }

    function updatePartListValue(part: Part, index: number, value: string) {
        if (part.values) {
            part.values[index] = parseInt(value, 10);
            updateSerial();
        }
    }

    function addPartListValue(part: Part) {
        if (!part.values) {
            part.values = [];
        }
        part.values.push(0);
        updateSerial();
    }

    function removePartListValue(part: Part, index: number) {
        if (part.values) {
            part.values.splice(index, 1);
            updateSerial();
        }
    }

</script>

<FormGroup label="Serial Input">
    <textarea
        class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm min-h-[80px]'
        value={serial}
        oninput={(e) => onSerialUpdate(e.currentTarget.value)}
        placeholder="Paste serial here..."
    ></textarea>
</FormGroup>

{#if error}
    <div class="mt-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded-md">
        <p>{error}</p>
    </div>
{/if}

{#if parsed}
    <div class="mt-4 space-y-4">
        <h3 class="text-lg font-semibold">Parsed Blocks</h3>
        <div class="flex flex-col gap-2 mt-2">
            {#each parsed as block, i}
                <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                    <h4 class="font-semibold">Block {i + 1}: Token {block.token}</h4>
                    {#if block.token === 4 || block.token === 6} <!-- VARINT or VARBIT -->
                        <FormGroup label="Value">
                            <input type="number" class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm' value={block.value} oninput={(e) => updateBlockValue(block, e.currentTarget.value)} />
                        </FormGroup>
                    {:else if block.token === 5 && block.part} <!-- PART -->
                        <FormGroup label="Index">
                            <input type="number" class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm' value={block.part.index} oninput={(e) => updatePartIndex(block.part!, e.currentTarget.value)} />
                        </FormGroup>
                        {#if block.part.subType === SUBTYPE_INT}
                            <FormGroup label="Value">
                                <input type="number" class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm' value={block.part.value} oninput={(e) => updatePartValue(block.part!, e.currentTarget.value)} />
                            </FormGroup>
                        {:else if block.part.subType === SUBTYPE_LIST}
                            <h5 class="font-semibold mt-2">Values</h5>
                            <div class="flex flex-col gap-2 mt-2">
                                {#each block.part.values as value, j}
                                    <div class="flex items-center gap-2">
                                        <input type="number" class='w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm' {value} oninput={(e) => updatePartListValue(block.part!, j, e.currentTarget.value)} />
                                        <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-red-700 rounded-md hover:bg-red-600 transition-all" onclick={() => removePartListValue(block.part!, j)}>X</button>
                                    </div>
                                {/each}
                                <button class="py-2 px-4 text-sm font-medium text-gray-300 bg-blue-700 rounded-md hover:bg-blue-600 transition-all" onclick={() => addPartListValue(block.part!)}>+ Add Value</button>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}
