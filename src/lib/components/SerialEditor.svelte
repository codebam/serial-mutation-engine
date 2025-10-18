<script lang="ts">
    import { serialToBinary } from '$lib/decode';
    import { parse } from '$lib/parser';
    import { parsedToSerial } from '$lib/encoder';
    import { ELEMENTAL_PATTERNS_V2 } from '$lib/utils';
    import FormGroup from './FormGroup.svelte';

    let serialInput = $state('');
    let parsedOutput = $state<any>(null);
    let reserializedOutput = $state('');

    const inputClasses = 'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const btnClasses = {
        primary: 'py-3 px-4 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed',
    };

    function analyzeSerial() {
        if (!serialInput) return;
        const binary = serialToBinary(serialInput);
        const parsed = parse(binary);
        parsedOutput = parsed;
        reserialize();
    }

    function reserialize() {
        if (!parsedOutput) return;
        const reserialized = parsedToSerial(parsedOutput);
        serialInput = reserialized;
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

    function debounce(func: Function, timeout = 1000){
        let timer: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    const debouncedAnalyzeSerial = debounce(analyzeSerial);

    $effect(() => {
        if (serialInput) {
            debouncedAnalyzeSerial();
        }
    });

    $effect(() => {
        if (parsedOutput) {
            reserialize();
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



{#if parsedOutput}
    <div class="mt-4 space-y-4">
        <h3 class="text-lg font-semibold">Parsed Parts</h3>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Header</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <FormGroup label="Type (hex)">
                    <input type="text" class={inputClasses} bind:value={parsedOutput.type.hex} />
                </FormGroup>
                <FormGroup label="Header (hex)">
                    <input type="text" class={inputClasses} bind:value={parsedOutput.header.hex} />
                </FormGroup>
                <FormGroup label="Prefix (hex)">
                    <input type="text" class={inputClasses} bind:value={parsedOutput.prefix.hex} />
                </FormGroup>
            </div>
        </div>

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
                                <input type="text" class={inputClasses} bind:value={chunk.chunk_data.hex} />
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
                                <input type="text" class={inputClasses} bind:value={chunk.chunk_data.hex} />
                            </FormGroup>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

    </div>
{/if}
