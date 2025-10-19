<script lang="ts">
    import { serialToBinary } from '$lib/decode';
    import { parse } from '$lib/parser';
    import { parsedToSerial } from '$lib/encoder';
    import { ELEMENTAL_PATTERNS_V2, MANUFACTURER_PATTERNS } from '$lib/utils';
    import FormGroup from './FormGroup.svelte';
    import Asset from './Asset.svelte';
    import { appendMutation, deleteMutation, shuffleAssetsMutation, randomizeAssetsMutation, repeatHighValuePartMutation } from '$lib/mutations';
    import type { ParsedSerial, State } from '$lib/types';

    let { serial, onSerialUpdate } = $props<{
        serial: string;
        onSerialUpdate: (newSerial: string) => void;
    }>();

    let parsedOutput = $state<ParsedSerial | null>(null);
    let assetsWithIds = $state<{ id: number; value: number }[]>([]);
    let assetIdCounter = 0;
    let copyJsonText = $state('Copy JSON');

    const inputClasses = 'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const assetColors = [
        'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500',
        'bg-blue-600', 'bg-sky-200', 'bg-cyan-200', 'bg-teal-200', 'bg-indigo-200',
        'bg-sky-300', 'bg-cyan-300', 'bg-teal-300', 'bg-indigo-300'
    ];
    const colorMap = new Map<number, string>();
    let colorIndex = 0;

    async function copyJson() {
        if (parsedOutput) {
            try {
                const jsonString = JSON.stringify(parsedOutput, null, 2);
                await navigator.clipboard.writeText(jsonString);
                copyJsonText = 'Copied!';
                setTimeout(() => (copyJsonText = 'Copy JSON'), 2000);
            } catch (error) {
                console.error('Failed to copy JSON:', error);
                copyJsonText = 'Error!';
                setTimeout(() => (copyJsonText = 'Copy JSON'), 2000);
            }
        }
    }

    function getColorForAsset(value: number): string {
        if (!colorMap.has(value)) {
            const color = assetColors[colorIndex % assetColors.length];
            colorMap.set(value, color);
            colorIndex++;
        }
        return colorMap.get(value)!;
    }

    function bitsToHex(bits: string): string {
        let hex = '';
        for (let i = 0; i < bits.length; i += 4) {
            const chunk = bits.substring(i, i + 4);
            hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
    }

    function hexToBits(hex: string): string {
        hex = hex.replace(/[^0-9a-fA-F]/g, '');
        let bits = '';
        for (let i = 0; i < hex.length; i++) {
            bits += parseInt(hex[i], 16).toString(2).padStart(4, '0');
        }
        return bits;
    }

    let preambleHex = $derived(parsedOutput ? bitsToHex(parsedOutput.preamble) : '');
    let trailerHex = $derived(parsedOutput ? bitsToHex(parsedOutput.trailer) : '');

    function analyzeSerial() {
        if (!serial) {
            parsedOutput = null;
            assetsWithIds = [];
            return;
        }
        const binary = serialToBinary(serial);
        const parsed = parse(binary);
        parsedOutput = parsed;

        if (parsed) {
            assetIdCounter = 0;
            assetsWithIds = parsed.assets.map((asset: string) => {
                const value = parseInt(asset, 2);
                return { id: assetIdCounter++, value: isNaN(value) ? 0 : value };
            });
        } else {
            assetsWithIds = [];
        }
    }

    function updateSerialFromAssets() {
        if (parsedOutput) {
            parsedOutput.assets = assetsWithIds.map(a => a.value.toString(2).padStart(6, '0'));
            onSerialUpdate(parsedToSerial(parsedOutput));
        }
    }

    function debounce<T extends (...args: any[]) => any>(func: T, timeout = 1000) {
        let timer: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), timeout);
        };
    }

    const debouncedAnalyzeSerial = debounce(analyzeSerial, 200);
    const debouncedUpdateSerialFromAssets = debounce(updateSerialFromAssets, 5000);

    $effect(() => {
        if (serial) {
            debouncedAnalyzeSerial();
        } else {
            analyzeSerial();
        }
    });

    function handlePaste(event: ClipboardEvent) {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text/plain');
        if (pastedText) {
            onSerialUpdate(pastedText);
            analyzeSerial();
        }
    }

    let dragIndex: number;

    function handleDragStart(index: number) {
        dragIndex = index;
    }

    function handleDrop(index: number) {
        const draggedItem = assetsWithIds.splice(dragIndex, 1)[0];
        assetsWithIds.splice(index, 0, draggedItem);
        debouncedUpdateSerialFromAssets();
    }

    function addAsset() {
        assetsWithIds.push({ id: assetIdCounter++, value: 1 });
        debouncedUpdateSerialFromAssets();
    }

    function updateAsset(id: number, newValue: number) {
        const asset = assetsWithIds.find((a) => a.id === id);
        if (asset) {
            asset.value = newValue;
            debouncedUpdateSerialFromAssets();
        }
    }

    function deleteAsset(id: number) {
        const index = assetsWithIds.findIndex(a => a.id === id);
        if (index !== -1) {
            assetsWithIds.splice(index, 1);
            debouncedUpdateSerialFromAssets();
        }
    }

    function applyMutation(mutation: (parsed: ParsedSerial, state: State) => ParsedSerial) {
        if (parsedOutput) {
            // A dummy state is created here because the mutations in the editor
            // don't rely on the full app state. This might need to be adjusted
            // if more complex mutations are added.
            const dummyState: State = {
                repository: '',
                seed: '',
                itemType: 'GUN',
                counts: { new: 0, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
                rules: {
                    targetOffset: 0,
                    mutableStart: 0,
                    mutableEnd: 0,
                    minChunk: 0,
                    maxChunk: 0,
                    targetChunk: 0,
                    minPart: 0,
                    maxPart: 0,
                    legendaryChance: 0,
                },
                generateStats: false,
                debugMode: false,
            };
            const newParsedOutput = mutation(parsedOutput, dummyState);
            parsedOutput = newParsedOutput;
            assetsWithIds = newParsedOutput.assets.map((asset: string) => {
                const value = parseInt(asset, 2);
                return { id: assetIdCounter++, value: isNaN(value) ? 0 : value };
            });
            updateSerialFromAssets();
        }
    }

    let generationCount = $state(10);
    let generatedSerials = $state('');

    function generateSerials(mutation: (parsed: ParsedSerial, state: State) => ParsedSerial) {
        if (parsedOutput) {
            const newSerials: string[] = [];
            const dummyState: State = {
                repository: '',
                seed: '',
                itemType: 'GUN',
                counts: { new: 0, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
                rules: {
                    targetOffset: 0,
                    mutableStart: 0,
                    mutableEnd: 0,
                    minChunk: 0,
                    maxChunk: 0,
                    targetChunk: 0,
                    minPart: 0,
                    maxPart: 0,
                    legendaryChance: 0,
                },
                generateStats: false,
                debugMode: false,
            };

            for (let i = 0; i < generationCount; i++) {
                // Deep copy parsedOutput for each iteration to avoid mutating the original object
                const newParsedOutput = mutation(JSON.parse(JSON.stringify(parsedOutput)), dummyState);
                const newSerial = parsedToSerial(newParsedOutput);
                newSerials.push(newSerial);
            }
            generatedSerials = newSerials.join('\n');
        }
    }

</script>

<FormGroup label="Serial Input">
    <textarea
        class={`${inputClasses} min-h-[80px]`}
        value={serial}
        oninput={(e) => onSerialUpdate(e.currentTarget.value)}
        placeholder="Paste serial here..."
        onpaste={handlePaste}
    ></textarea>
</FormGroup>

{#if parsedOutput}
    <div class="mt-4 space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Parsed Parts</h3>
            <button onclick={copyJson} class="py-1 px-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">{copyJsonText}</button>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Manufacturer</h4>
            <FormGroup label="Manufacturer">
                <select class={inputClasses} bind:value={parsedOutput.manufacturer.name}>
                    {#each Object.keys(MANUFACTURER_PATTERNS) as manufacturer}
                        <option value={manufacturer}>{manufacturer}</option>
                    {/each}
                </select>
            </FormGroup>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Level</h4>
            <FormGroup label="Level">
                <input type="number" class={inputClasses} bind:value={parsedOutput.level.value} />
            </FormGroup>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Preamble</h4>
            <FormGroup label="Preamble (hex)">
                <input type="text" class={inputClasses} bind:value={preambleHex} oninput={(e) => { parsedOutput.preamble = hexToBits(e.currentTarget.value); }} />
            </FormGroup>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Assets</h4>
            <div class="flex flex-wrap gap-2">
                {#each assetsWithIds as asset, i (asset.id)}
                    <div
                        role="listitem"
                        draggable="true"
                        ondragstart={() => handleDragStart(i)}
                        ondragover={(e) => e.preventDefault()}
                        ondrop={(e) => {
                            e.preventDefault();
                            handleDrop(i);
                        }}
                    >
                        <Asset 
                            value={asset.value} 
                            onUpdate={(newValue) => updateAsset(asset.id, newValue)} 
                            onDelete={() => deleteAsset(asset.id)}
                            color={getColorForAsset(asset.value)}
                        />
                    </div>
                {/each}
                <button
                    onclick={addAsset}
                    class="border border-gray-300 p-2.5 bg-gray-200 text-2xl cursor-pointer flex justify-center items-center text-black w-16 rounded-md"
                    >+</button
                >
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick={() => applyMutation(appendMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Append Asset</button>
                <button onclick={() => applyMutation(deleteMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Delete Asset</button>
                <button onclick={() => applyMutation(shuffleAssetsMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Shuffle Assets</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick={() => applyMutation(randomizeAssetsMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Randomize Assets</button>
                <button onclick={() => applyMutation(repeatHighValuePartMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Repeat High Value Part</button>
            </div>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Generate Serials</h4>
            <FormGroup label="Number of Serials">
                <input type="number" class={inputClasses} bind:value={generationCount} />
            </FormGroup>
            <div class="flex gap-2 mt-4">
                <button onclick={() => generateSerials(shuffleAssetsMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Generate Shuffled</button>
                <button onclick={() => generateSerials(randomizeAssetsMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Generate Randomized</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick={() => generateSerials(repeatHighValuePartMutation)} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Generate Repeating</button>
            </div>
            {#if generatedSerials}
                <FormGroup label="Generated Serials" extraClasses="mt-4">
                    <textarea
                        class={`${inputClasses} min-h-[160px]`}
                        readonly
                        value={generatedSerials}
                    ></textarea>
                </FormGroup>
            {/if}
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Trailer</h4>
            <FormGroup label="Trailer (hex)">
                <input type="text" class={inputClasses} bind:value={trailerHex} oninput={(e) => { parsedOutput.trailer = hexToBits(e.currentTarget.value); }} />
            </FormGroup>
            {#if trailerHex === ''}
                <p class="text-xs text-gray-400 mt-2">No trailer bits were found for this serial.</p>
            {/if}
        </div>
    </div>
{/if}