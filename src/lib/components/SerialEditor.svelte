<script lang="ts">
    import Accordion from './Accordion.svelte';
    import FormGroup from './FormGroup.svelte';
    import DeserializerOutput from './DeserializerOutput.svelte';
    import {
        BASE85_ALPHABET,
        ELEMENTAL_PATTERNS_V2,
        MANUFACTURER_PATTERNS,
        detectItemLevel,
        hexToBinary,
        encodeSerial,
        ELEMENT_FLAG
    } from '$lib/utils';

    let serial = $state('');
    let serialInput = $state('');
    let analysis: {
        type: string;
        manufacturer: string;
        hex: string;
        safeEditStart: number | string;
        safeEditEnd: number | string;
        level: number | string;
        v2Element: { element: string; index: number; pattern: string } | null;
    } | null = $state(null);
    let binary = $state('');
    let modifiedBinary = $state('');
    let selection = $state({ start: 0, end: 0 });
    let level: number | null = $state(null);
    let levelFoundAt: number | null = $state(null);

    let foundV2Element: { element: string; pattern: string; index: number } | null = $state(null);

    let newSerial = $state('');
    let modifiedBase85 = $state('');

    let deserializedText = $state('');

    let aiVariations = $state([]);
    let aiLoading = $state(false);
    let aiError = $state('');

    async function getAIVariations(event: SubmitEvent) {
        event.preventDefault();
        aiLoading = true;
        aiError = '';
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ deserialized_serial: deserializedText })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch AI variations');
            }

            const data = await response.json();
            const lines = data.response.split('\n');
            const firstVariationIndex = lines.findIndex(line => line.includes('|'));
            const variations = firstVariationIndex === -1 ? lines : lines.slice(firstVariationIndex);
            aiVariations = variations.map(v => v.replace(/^[0-9]+\.\s*/, '')).filter(v => v.trim() !== '');
        } catch (error: any) {
            aiError = error.message;
        } finally {
            aiLoading = false;
        }
    }

    async function deserialize(serialToUse: string) {
        try {
            const response = await fetch("https://borderlands4-deserializer.nicnl.com/api/v1/deserialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serial_b85: serialToUse })
            });
            const data = await response.json();
            if (data.deserialized) {
                deserializedText = data.deserialized;
                return true;
            }
            console.error('Deserialization failed: ' + (data.error || 'Unknown error'));
            return false;
        } catch (error) {
            console.error("Deserialization error:", error);
            return false;
        }
    }
    async function reserialize() {
        try {
            const response = await fetch("https://borderlands4-deserializer.nicnl.com/api/v1/reserialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deserialized: deserializedText })
            });
            const data = await response.json();
            if (data.serial_b85) {
                modifiedBase85 = data.serial_b85;
            } else {
                console.error('Reserialization failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("Reserialization error:", error);
        }
    }

    const inputClasses = 'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const btnClasses = {
        primary: 'py-3 px-4 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed',
        secondary: 'py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all',
    };

    async function decodeSerial() {
        serial = serialInput;
        if (!serial.startsWith('@U')) {
            console.error('Invalid serial format. It must start with @U');
            return;
        }

        const ok = await deserialize(serialInput);
        if (!ok) {
            console.error('Deserialization failed.');
        }

        const encoded = serial.substring(2);
        let decoded_bytes = [];
        let current_value = 0;
        let char_count = 0;

        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            const index = BASE85_ALPHABET.indexOf(char);
            if (index === -1) {
                continue; // Skip invalid characters
            }
            current_value = current_value * 85 + index;
            char_count++;
            if (char_count === 5) {
                decoded_bytes.push((current_value >> 24) & 0xFF);
                decoded_bytes.push((current_value >> 16) & 0xFF);
                decoded_bytes.push((current_value >> 8) & 0xFF);
                decoded_bytes.push(current_value & 0xFF);
                current_value = 0;
                char_count = 0;
            }
        }

        if (char_count > 0) {
            for (let i = char_count; i < 5; i++) {
                current_value = current_value * 85 + 84;
            }
            for (let i = 0; i < char_count - 1; i++) {
                decoded_bytes.push((current_value >> (24 - i * 8)) & 0xFF);
            }
        }

        const mirrored_bytes = decoded_bytes.map(byte => {
            let mirrored = 0;
            for (let j = 0; j < 8; j++) {
                if ((byte >> j) & 1) {
                    mirrored |= 1 << (7 - j);
                }
            }
            return mirrored;
        });

        const hex_data = mirrored_bytes.map(b => b.toString(16).padStart(2, '0')).join('');
        const binary_string = mirrored_bytes.map(b => b.toString(2).padStart(8, '0')).join('');
        
        binary = binary_string;
        modifiedBinary = binary_string;

        // Classification
        let serialType = 'UNKNOWN';
        if (binary_string.startsWith('0010000100')) {
            serialType = 'TYPE A';
        } else if (binary_string.startsWith('0010000110')) {
            serialType = 'TYPE B';
        }

        // Manufacturer
        const first_4_bytes = hex_data.substring(0, 8);
        let manufacturer = 'Unknown';
        for (const [m, patterns] of Object.entries(MANUFACTURER_PATTERNS)) {
            for (const pattern of patterns) {
                if (first_4_bytes.startsWith(pattern)) {
                    manufacturer = m;
                    break;
                }
            }
            if (manufacturer !== 'Unknown') break;
        }
        
        const safeEditStart = serial.indexOf('u~Q') + 3;
        const safeEditEnd = serial.length - 12;

        const safeStartBits = 32;
        const safeEndBits = binary_string.length - 24;
        selection = { start: safeStartBits, end: safeEndBits };

        const [detectedLevel, levelPos] = detectItemLevel(binary_string);
        level = detectedLevel as number;
        levelFoundAt = levelPos;

        // V2 Elemental Pattern Detection
        const v2ElementIndex = binary_string.indexOf(ELEMENT_FLAG);
        let foundV2ElementData: { element: string; pattern: string; index: number } | null = null;
        if (v2ElementIndex !== -1) {
            const elementStartIndex = v2ElementIndex + ELEMENT_FLAG.length;
            const elementPattern = binary_string.substring(elementStartIndex, elementStartIndex + 8);
            const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2).find(([, pattern]) => pattern === elementPattern);
            if (foundElement) {
                foundV2ElementData = { element: foundElement[0], pattern: foundElement[1], index: elementStartIndex };
                foundV2Element = foundV2ElementData;
            }
        }

        analysis = {
            type: serialType,
            manufacturer: manufacturer,
            hex: hex_data,
            safeEditStart: safeEditStart > 2 ? safeEditStart : 'N/A',
            safeEditEnd: safeEditEnd > safeEditStart ? safeEditEnd : 'N/A',
            level: detectedLevel,
            v2Element: foundV2ElementData,
        };
    }

    function handleLevelChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const newLevel = parseInt(target.value, 10);
        if (isNaN(newLevel) || newLevel < 0 || newLevel > 50) {
            return;
        }
        level = newLevel;

        if (analysis && analysis.level !== 'Unknown' && levelFoundAt !== -1) {
            let newLevelValue;
            if (newLevel === 1) {
                newLevelValue = 49;
            } else if (newLevel === 50) {
                newLevelValue = 50;
            } else {
                newLevelValue = newLevel;
            }

            const levelPattern = newLevelValue.toString(2).padStart(8, '0');
            
            let startPos = -1;
            if (analysis.type === 'TYPE A') {
                startPos = 10; // As per KNOWLEDGE.md for varint5, but we are using 8bit for now.
            } else if (analysis.type === 'TYPE B') {
                startPos = 15; // As per KNOWLEDGE.md
            }

            // Fallback to detected position if type-based position is not helpful
            if(levelFoundAt !== null && levelFoundAt !== -1) {
                // if standard marker was found, the level bits start after the 6-bit marker
                const LEVEL_MARKER = '000000';
                if(modifiedBinary.substring(levelFoundAt, levelFoundAt + 6) === LEVEL_MARKER) {
                    startPos = levelFoundAt + 6;
                } else {
                    startPos = levelFoundAt;
                }
            }

            if (startPos !== -1) {
                const prefix = modifiedBinary.substring(0, startPos);
                const suffix = modifiedBinary.substring(startPos + 8);
                modifiedBinary = prefix + levelPattern + suffix;
            }
        }
    }

    function handleV2ElementChange(newElement: string) {
        if (foundV2Element) {
            const newPattern = ELEMENTAL_PATTERNS_V2[newElement as keyof typeof ELEMENTAL_PATTERNS_V2];
            const prefix = modifiedBinary.substring(0, foundV2Element.index);
            const suffix = modifiedBinary.substring(foundV2Element.index + foundV2Element.pattern.length);
            const newModifiedBinary = prefix + newPattern + suffix;
            modifiedBinary = newModifiedBinary;

            foundV2Element = { ...foundV2Element, element: newElement, pattern: newPattern };
        }
    }

    function handleSelectionChange(e: Event) {
        const target = e.target as HTMLInputElement;
        const { name, value } = target;
        selection = { ...selection, [name]: parseInt(value, 10) };
    }

    $effect(() => {
        if (modifiedBinary) {
            modifiedBase85 = encodeSerial(modifiedBinary);
        }
    });
</script>


    <FormGroup label="Serial to Analyze">
        <textarea
            class={`${inputClasses} min-h-[80px]`}
            bind:value={serialInput}
            placeholder="Paste serial here..."
        ></textarea>
    </FormGroup>
    <button onclick={decodeSerial} class={btnClasses.primary}>Analyze</button>
    {#if analysis}
        <div class="flex flex-col gap-2 mt-4">
            <h3 class="text-lg font-semibold">Analysis Results</h3>
            <p><strong>Type:</strong> {analysis.type}</p>
            <p><strong>Manufacturer:</strong> {analysis.manufacturer}</p>
            <p><strong>Level:</strong> {analysis.level}</p>

            {#if analysis.v2Element}
                <p><strong>Element:</strong> {analysis.v2Element.element} at index {analysis.v2Element.index}</p>
            {/if}
            <p><strong>Hex:</strong> <span class="font-mono text-xs break-all">
                {analysis.hex}
            </span></p>
            <p><strong>Safe Edit Start (after u~Q):</strong> {analysis.safeEditStart}</p>
            <p><strong>Safe Edit End (preserve trailer):</strong> {analysis.safeEditEnd}</p>
            
            <h3 class="text-lg font-semibold mt-2">Level Editor</h3>
            <FormGroup label="Item Level (0-50)">
                <input type="number" bind:value={level} onchange={handleLevelChange} class={inputClasses} min="0" max="50" />
            </FormGroup>

            {#if foundV2Element}
                <h3 class="text-lg font-semibold mt-2">Element Editor</h3>
                <FormGroup label={`Element at index ${foundV2Element.index}`}>
                    <select bind:value={foundV2Element.element} onchange={(e) => handleV2ElementChange((e.target as HTMLSelectElement).value)} class={inputClasses}>
                        {#each Object.keys(ELEMENTAL_PATTERNS_V2) as type}
                            <option value={type}>{type}</option>
                        {/each}
                    </select>
                </FormGroup>
            {/if}

            <h3 class="text-lg font-semibold mt-4">Deserializer/Reserializer</h3>
            <p class="text-sm text-gray-400">
                Powered by <a href="https://borderlands4-deserializer.nicnl.com/" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">borderlands4-deserializer</a> by @Nicnl and @InflamedSebi
            </p>
            <DeserializerOutput deserializedText={deserializedText} on:update={(e) => deserializedText = e.detail.value} />
            <FormGroup label="Deserialized Text">
                <textarea
                    class={`${inputClasses} min-h-[120px]`}
                    bind:value={deserializedText}
                    placeholder="Deserialized output will appear here..."
                ></textarea>
            </FormGroup>
            <button onclick={reserialize} class={btnClasses.secondary}>Reserialize</button>

            <h3 class="text-lg font-semibold mt-4">AI Variations</h3>
            <p class="text-sm text-gray-400">Use AI to generate variations of your deserialized serial.</p>
            <form onsubmit={getAIVariations}>
                <FormGroup label="Deserialized Serial for AI">
                    <textarea
                        class={`${inputClasses} min-h-[120px]`}
                        bind:value={deserializedText}
                        placeholder="Deserialized output will appear here..."
                    ></textarea>
                </FormGroup>
                <button type="submit" class={btnClasses.primary} disabled={aiLoading}>
                    {#if aiLoading}
                        Generating...
                    {:else}
                        Get AI Variations
                    {/if}
                </button>
            </form>

            {#if aiError}
                <p class="text-red-500 mt-2">{aiError}</p>
            {/if}

            {#if aiVariations.length > 0}
                <div class="mt-4">
                    <h4 class="text-md font-semibold">Generated Variations</h4>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        {#each aiVariations as variation}
                            <li class="text-sm">{variation}</li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if modifiedBase85}
                <div class="mt-4">
                    <h3 class="text-lg font-semibold">Modified Base85 Data</h3>
                    <textarea class={`${inputClasses} h-24`} readonly bind:value={modifiedBase85}></textarea>
                </div>
            {/if}
        </div>
    {/if}

