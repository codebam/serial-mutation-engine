<script lang="ts">
    import { serialToBinary } from '$lib/decode';
    import { parse } from '$lib/parser';
    import { parsedToSerial } from '$lib/encoder';
    import { ELEMENTAL_PATTERNS_V2, MANUFACTURER_PATTERNS } from '$lib/utils';
    import FormGroup from './FormGroup.svelte';

    let serialInput = $state('');
    let parsedOutput = $state<any>(null);

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
        hex = hex.replace(/[^0-9a-fA-F]/g, '');
        let bits = '';
        for (let i = 0; i < hex.length; i++) {
            bits += parseInt(hex[i], 16).toString(2).padStart(4, '0');
        }
        return bits;
    }

    let preambleHex = $derived(parsedOutput ? bitsToHex(parsedOutput.preamble) : '');
    let assetsString = $derived(parsedOutput ? parsedOutput.assets.map(asset => parseInt(asset, 2).toString(16)).join(', ') : '');
    let trailerHex = $derived(parsedOutput ? bitsToHex(parsedOutput.trailer) : '');

    function analyzeSerial() {
        if (!serialInput) return;
        const binary = serialToBinary(serialInput);
        const parsed = parse(binary);
        parsedOutput = parsed;
    }

    function updateSerial() {
        const newSerial = parsedToSerial(parsedOutput);
        serialInput = newSerial;
    }

    let assetsError = $state(false);

    function handleAssetsInput(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        try {
            parsedOutput.assets = value.split(',').map(s => {
                const trimmed = s.trim();
                if (trimmed === '') return '';
                return parseInt(trimmed, 16).toString(2).padStart(6, '0');
            });
            assetsError = false;
            updateSerial();
        } catch (error) {
            assetsError = true;
        }
    }

    function reserialize() {
        if (!parsedOutput) return;
        console.log('reserializing:', parsedOutput);
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

    function handlePaste(event: ClipboardEvent) {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text/plain');
        if (pastedText) {
            serialInput = pastedText;
            analyzeSerial();
        }
    }

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
        onpaste={analyzeSerial}
    ></textarea>
</FormGroup>

{#if parsedOutput}
    <div class="mt-4 space-y-4">
        <h3 class="text-lg font-semibold">Parsed Parts</h3>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Preamble</h4>
            <FormGroup label="Preamble (hex)">
                <input type="text" class={inputClasses} bind:value={preambleHex} oninput={(e) => { parsedOutput.preamble = hexToBits(e.currentTarget.value); updateSerial(); }} />
            </FormGroup>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Assets</h4>
            <FormGroup label="Assets (comma-separated hex)">
                <input type="text" class="{inputClasses} {assetsError ? 'border-red-500' : ''}" bind:value={assetsString} oninput={handleAssetsInput} />
            </FormGroup>
        </div>

        <div class="p-4 bg-gray-800 border border-gray-700 rounded-md">
            <h4 class="font-semibold">Trailer</h4>
            <FormGroup label="Trailer (hex)">
                <input type="text" class={inputClasses} bind:value={trailerHex} oninput={(e) => { parsedOutput.trailer = hexToBits(e.currentTarget.value); updateSerial(); }} />
            </FormGroup>
        </div>
    </div>
{/if}
