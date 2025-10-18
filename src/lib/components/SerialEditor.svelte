<script lang="ts">
    import { serialToBinary } from '$lib/decode';
    import { parse } from '$lib/parser';
    import { parsedToSerial } from '$lib/encoder';
    import { ELEMENTAL_PATTERNS_V2, MANUFACTURER_PATTERNS } from '$lib/utils';
    import FormGroup from './FormGroup.svelte';

    let serialInput = $state('');
    let parsedOutput = $state<any>(null);
    let reserializedOutput = $state('');

    const inputClasses = 'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const btnClasses = {
        primary: 'py-3 px-4 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed',
    };

    function bitsToHex(bits: string): string {
        let hex = '';
        for (let i = 0; i < bits.length; i += 4) {
            const chunk = bits.substring(i, i + 4);
            hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
    }

    function hexToBits(hex: string): string {
        let bits = '';
        for (let i = 0; i < hex.length; i++) {
            bits += parseInt(hex[i], 16).toString(2).padStart(4, '0');
        }
        return bits;
    }

    let typeHex = $derived(parsedOutput ? bitsToHex(parsedOutput.type.bits) : '');
    let headerHex = $derived(parsedOutput ? bitsToHex(parsedOutput.header.bits) : '');
    let prefixHex = $derived(parsedOutput ? bitsToHex(parsedOutput.prefix.bits) : '');

    function analyzeSerial() {
        if (!serialInput) return;
        const binary = serialToBinary(serialInput);
        const parsed = parse(binary);
        parsedOutput = parsed;
        reserializedOutput = '';
    }

    function reserialize() {
        if (!parsedOutput) return;
        reserializedOutput = parsedToSerial(parsedOutput);
    }

    function handleElementChange(e: Event) {
        if (!parsedOutput || !parsedOutput.v2_element) return;
        const newElement = (e.target as HTMLSelectElement).value;
        const newPattern = ELEMENTAL_PATTERNS_V2[newElement as keyof typeof ELEMENTAL_PATTERNS_V2];
        parsedOutput.v2_element = {
            ...parsedOutput.v2_element,
            element: newElement,
            pattern: newPattern,
        };
    }

    function handleManufacturerChange(e: Event) {
        if (!parsedOutput || !parsedOutput.manufacturer) return;
        const newManufacturer = (e.target as HTMLSelectElement).value;
        const newPattern = MANUFACTURER_PATTERNS[newManufacturer][0];
        parsedOutput.manufacturer = {
            ...parsedOutput.manufacturer,
            name: newManufacturer,
            pattern: newPattern,
        };
    }

    function debounce<T extends (...args: any[]) => any>(func: T, timeout = 1000) {
        let timer: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), timeout);
        };
    }

    const debouncedAnalyzeSerial = debounce(analyzeSerial);

    $effect(() => {
        if (serialInput) {
            debouncedAnalyzeSerial();
        }
    });

</script>

<FormGroup label="Serial Input">
    <textarea
        class={`${inputClasses} min-h-[80px]`}
        bind:value={serialInput}
        placeholder="Paste serial here..."
    ></textarea>
</FormGroup>
<div class="flex gap-2">
    <button onclick={reserialize} class={btnClasses.primary} disabled={!parsedOutput}>Reserialize</button>
</div>



{#if parsedOutput}
    <div class="mt-4 space-y-4">
        <h3 class="text-lg font-semibold">Parsed Parts</h3>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Header</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormGroup label="Type (hex)">
                    <input type="text" class={inputClasses} bind:value={typeHex} oninput={(e) => parsedOutput.type.bits = hexToBits(e.currentTarget.value)} />
                </FormGroup>
                <FormGroup label="Header (hex)">
                    <input type="text" class={inputClasses} bind:value={headerHex} oninput={(e) => parsedOutput.header.bits = hexToBits(e.currentTarget.value)} />
                </FormGroup>
                <FormGroup label="Prefix (hex)">
                    <input type="text" class={inputClasses} bind:value={prefixHex} oninput={(e) => parsedOutput.prefix.bits = hexToBits(e.currentTarget.value)} />
                </FormGroup>
            </div>
        </div>

        {#if parsedOutput.level}
            <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                <h4 class="font-semibold">Level</h4>
                <FormGroup label="Level">
                    <input type="number" class={inputClasses} bind:value={parsedOutput.level.value} />
                </FormGroup>
            </div>
        {/if}

        {#if parsedOutput.manufacturer}
            <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                <h4 class="font-semibold">Manufacturer</h4>
                <FormGroup label="Manufacturer">
                    <select class={inputClasses} onchange={handleManufacturerChange}>
                        {#each Object.keys(MANUFACTURER_PATTERNS) as manufacturer}
                            <option value={manufacturer} selected={manufacturer === parsedOutput.manufacturer.name}>{manufacturer}</option>
                        {/each}
                    </select>
                </FormGroup>
            </div>
        {/if}

        {#if parsedOutput.v2_element}
            <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                <h4 class="font-semibold">V2 Element</h4>
                <FormGroup label="Element">
                    <select class={inputClasses} onchange={handleElementChange}>
                        {#each Object.keys(ELEMENTAL_PATTERNS_V2) as element}
                            <option value={element} selected={element === parsedOutput.v2_element.element}>{element}</option>
                        {/each}
                    </select>
                </FormGroup>
            </div>
        {/if}

        {#if parsedOutput.chunks && parsedOutput.chunks.length > 0}
            <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                <h4 class="font-semibold">Body Chunks</h4>
                <div class="space-y-2 mt-2">
                    {#each parsedOutput.chunks as chunk, i}
                        <div class="flex items-center gap-2">
                            <FormGroup label={`Len Code ${i}`}>
                                <input type="number" class={inputClasses} bind:value={chunk.len_code} />
                            </FormGroup>
                            <FormGroup label={`Chunk Data ${i} (hex)`}>
                                <input type="text" class={inputClasses} value={bitsToHex(chunk.chunk_data.bits)} oninput={(e) => chunk.chunk_data.bits = hexToBits(e.currentTarget.value)} />
                            </FormGroup>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if parsedOutput.trailer_chunks && parsedOutput.trailer_chunks.length > 0}
            <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
                <h4 class="font-semibold">Trailer Chunks</h4>
                <div class="space-y-2 mt-2">
                    {#each parsedOutput.trailer_chunks as chunk, i}
                        <div class="flex items-center gap-2">
                            <FormGroup label={`Chunk Type ${i}`}>
                                <input type="text" class={inputClasses} bind:value={chunk.chunk_type} disabled />
                            </FormGroup>
                            <FormGroup label={`Chunk Data ${i} (hex)`}>
                                <input type="text" class={inputClasses} value={bitsToHex(chunk.chunk_data.bits)} oninput={(e) => chunk.chunk_data.bits = hexToBits(e.currentTarget.value)} />
                            </FormGroup>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{/if}

{#if reserializedOutput}
    <div class="mt-4">
        <h3 class="text-lg font-semibold">Reserialized Output</h3>
        <textarea class={`${inputClasses} h-24`} readonly bind:value={reserializedOutput}></textarea>
    </div>
{/if}