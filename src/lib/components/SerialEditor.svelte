<script lang="ts">
    import { serialToBytes } from '$lib/decode';
    import { parse } from '$lib/parser';
    import { parsedToSerial } from '$lib/encoder';
    import { ELEMENTAL_PATTERNS_V2, MANUFACTURER_PATTERNS } from '$lib/utils';
    import FormGroup from './FormGroup.svelte';
    import Asset from './Asset.svelte';
    import { appendMutation, deleteMutation, shuffleAssetsMutation, randomizeAssetsMutation, repeatHighValuePartMutation, appendHighValuePartMutation } from '$lib/mutations';
    import type { ParsedSerial, State } from '$lib/types';

    let { serial, onSerialUpdate, rules } = $props<{
        serial: string;
        onSerialUpdate: (newSerial: string) => void;
        rules: State['rules'];
    }>();

    let parsedOutput = $state<any | null>(null);
    let assetsWithIds = $state<{ id: number; value: number }[]>([]);
    let assetIdCounter = 0;
    let copyJsonText = $state('Copy JSON');
    let copyUrlText = $state('Copy URL');
    let originalAssetsCount = $state(0);

    async function copyUrl() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('serial', serial);
            await navigator.clipboard.writeText(url.toString());
            copyUrlText = 'Copied!';
            setTimeout(() => (copyUrlText = 'Copy URL'), 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            copyUrlText = 'Error!';
            setTimeout(() => (copyUrlText = 'Copy URL'), 2000);
        }
    }

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

    async function pasteJson() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const newParsed = JSON.parse(clipboardText);

            parsedOutput = newParsed;

            assetIdCounter = 0; // Reset counter
            assetsWithIds = newParsed.assets.map((asset: bigint) => {
                return { id: assetIdCounter++, value: Number(asset) };
            });
            originalAssetsCount = newParsed.assets.length;

            reserialize();
        } catch (error) {
            console.error('Failed to paste or parse JSON:', error);
            alert('Failed to paste or parse JSON from clipboard.');
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

    function bitsToHex(bits: number[]): string {
        if (!bits) return '';
        let hex = '';
        for (let i = 0; i < bits.length; i += 4) {
            const chunk = bits.slice(i, i + 4).join('');
            hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
    }

    function hexToBits(hex: string): number[] {
        hex = hex.replace(/[^0-9a-fA-F]/g, '');
        let bits: number[] = [];
        for (let i = 0; i < hex.length; i++) {
            bits.push(...parseInt(hex[i], 16).toString(2).padStart(4, '0').split('').map(Number));
        }
        return bits;
    }

    let preambleHex = $derived(parsedOutput ? bitsToHex(parsedOutput.preamble_bits) : '');
    let trailerHex = $derived(parsedOutput ? bitsToHex(parsedOutput.trailer_bits) : '');

    function analyzeSerial() {
        if (!serial) {
            parsedOutput = null;
            assetsWithIds = [];
            originalAssetsCount = 0;
            return;
        }
        try {
            const bytes = serialToBytes(serial);
            const parsed = parse(bytes);
            parsedOutput = parsed;

            if (parsed) {
                originalAssetsCount = parsed.assets.length;
                assetIdCounter = 0;
                assetsWithIds = parsed.assets.map((asset: bigint) => {
                    return { id: assetIdCounter++, value: Number(asset) };
                });
            } else {
                assetsWithIds = [];
                originalAssetsCount = 0;
            }
        } catch (error) {
            console.error('Failed to parse serial:', error);
            parsedOutput = null;
            assetsWithIds = [];
            originalAssetsCount = 0;
        }
    }

    function updateSerialFromAssets() {
        if (parsedOutput) {
            const newAssets = assetsWithIds.map(a => BigInt(a.value));

            const newParsed = { ...parsedOutput };
            newParsed.assets = newAssets;

            onSerialUpdate(parsedToSerial(newParsed));
        }
    }

    function reserialize() {
        if (parsedOutput) {
            onSerialUpdate(parsedToSerial(parsedOutput));
        }
    }

    function handleManufacturerChange() {
        if (parsedOutput?.manufacturer) {
            const newName = parsedOutput.manufacturer.name;
            const newPattern = MANUFACTURER_PATTERNS[newName][0];
            parsedOutput.manufacturer.pattern = newPattern;
            debouncedReserialize();
        }
    }

    function handleElementChange() {
        if (parsedOutput?.element) {
            const newName = parsedOutput.element.name;
            const newPattern = ELEMENTAL_PATTERNS_V2[newName];
            parsedOutput.element.pattern = newPattern;
            debouncedReserialize();
        }
    }

    function debounce<T extends (...args: any[]) => any>(func: T, timeout = 1000) {
        let timer: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), timeout);
        };
    }

    const debouncedAnalyzeSerial = debounce(analyzeSerial, 0);
    const debouncedUpdateSerialFromAssets = debounce(updateSerialFromAssets, 5000);
    const debouncedReserialize = debounce(reserialize, 1000);

    

    $effect(() => {
        if (serial) {
            debouncedAnalyzeSerial();
        } else {
            analyzeSerial();
        }
    });

    

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

    function applyMutation(mutation: (parsed: any, state: State) => any) {
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
            assetsWithIds = newParsedOutput.assets.map((asset: bigint) => {
                return { id: assetIdCounter++, value: Number(asset) };
            });
            updateSerialFromAssets();
        }
    }

    let generationCount = $state(10);
    let generatedSerials = $state('');
    let isGenerating = $state(false);
    let generationProgress = $state(0);

    let worker: Worker | undefined;
    $effect(() => {
        async function setupWorker() {
            const MyWorker = await import('$lib/worker/worker.js?worker');
            worker = new MyWorker.default();

            worker.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'generate_from_editor_progress') {
                    generationProgress = (payload.generated / payload.total) * 100;
                } else if (type === 'generate_from_editor_complete') {
                    generatedSerials = payload.serials.join('\n');
                    isGenerating = false;
                    generationProgress = 0;
                } else if (type === 'error') {
                    console.error('Worker error:', payload.message);
                    isGenerating = false;
                    generationProgress = 0;
                }
            };
        }
        setupWorker();

        return () => {
            worker?.terminate();
        };
    });

    function startWorkerGeneration(mutationName: string) {
        if (worker && parsedOutput) {
            isGenerating = true;
            generationProgress = 0;
            generatedSerials = '';

            const replacer = (key: any, value: any) =>
                typeof value === 'bigint' ? value.toString() : value;

            worker.postMessage({
                type: 'generate_from_editor',
                payload: {
                    parsedSerial: JSON.parse(JSON.stringify(parsedOutput, replacer)),
                    originalAssetsCount: originalAssetsCount,
                    generationCount: generationCount,
                    mutationName: mutationName,
                    rules: JSON.parse(JSON.stringify(rules))
                }
            });
        }
    }

</script>

<FormGroup label="Serial Input">
    <textarea
        class={`${inputClasses} min-h-[80px]`}
        value={serial}
        oninput={(e) => onSerialUpdate(e.currentTarget.value)}
        placeholder="Paste serial here..."
        
        
    ></textarea>
</FormGroup>

<div class="mt-4 flex justify-end gap-2">
    <button onclick={copyUrl} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">{copyUrlText}</button>
    <button onclick={pasteJson} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">Paste JSON</button>
</div>

{#if parsedOutput}
    <div class="mt-4 space-y-4">
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Parsed Parts</h3>
            <button onclick={copyJson} class="py-1 px-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all">{copyJsonText}</button>
        </div>

        {#if parsedOutput.manufacturer}
        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Manufacturer</h4>
            <FormGroup label="Manufacturer">
                <select class={inputClasses} bind:value={parsedOutput.manufacturer.name} oninput={handleManufacturerChange}>
                    {#each Object.keys(MANUFACTURER_PATTERNS) as manufacturer}
                        <option value={manufacturer}>{manufacturer}</option>
                    {/each}
                </select>
            </FormGroup>
        </div>
        {/if}

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Level</h4>
            <FormGroup label="Level">
                <input type="number" class={inputClasses} bind:value={parsedOutput.level.value} oninput={debouncedReserialize} />
            </FormGroup>
        </div>

        {#if parsedOutput.element}
        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Element</h4>
            <FormGroup label="Element">
                <select class={inputClasses} bind:value={parsedOutput.element.name} onchange={handleElementChange}>
                    {#each Object.keys(ELEMENTAL_PATTERNS_V2) as element}
                        <option value={element}>{element}</option>
                    {/each}
                </select>
            </FormGroup>
        </div>
{/if}

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Preamble</h4>
            <FormGroup label="Preamble (hex)">
                <input type="text" class={inputClasses} value={preambleHex} oninput={(e) => { parsedOutput.preamble_bits = hexToBits(e.currentTarget.value); debouncedReserialize(); }} />
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
                <button onclick={() => startWorkerGeneration('shuffleAssetsMutation')} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" disabled={isGenerating}>Generate Shuffled</button>
                <button onclick={() => startWorkerGeneration('randomizeAssetsMutation')} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" disabled={isGenerating}>Generate Randomized</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button onclick={() => startWorkerGeneration('repeatHighValuePartMutation')} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" disabled={isGenerating}>Generate Repeating</button>
                <button onclick={() => startWorkerGeneration('appendHighValuePartMutation')} class="py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all" disabled={isGenerating}>Generate Appended</button>
            </div>
            {#if isGenerating}
                <div class="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: {generationProgress}%;"></div>
                </div>
            {/if}
            {#if generatedSerials}
                <FormGroup label={`Generated Serials (${generatedSerials.split('\n').filter(s => s).length})`} extraClasses="mt-4">
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
                <input type="text" class={inputClasses} value={trailerHex} oninput={(e) => { parsedOutput.trailer_bits = hexToBits(e.currentTarget.value); debouncedReserialize(); }} />
            </FormGroup>
            {#if trailerHex === ''}
                <p class="text-xs text-gray-400 mt-2">No trailer bits were found for this serial.</p>
            {/if}
        </div>
    </div>
{/if}