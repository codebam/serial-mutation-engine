<script lang="ts">
    import Accordion from './Accordion.svelte';
    import FormGroup from './FormGroup.svelte';
    import {
        BASE85_ALPHABET,
        ELEMENTAL_PATTERNS_V2,
        BULLET_TYPE_PATTERNS,
        MANUFACTURER_PATTERNS,
        detectItemLevel,
        hexToBinary,
        encodeSerial,
        ELEMENT_FLAG
    } from '$lib/utils';

    let serial = $state('');
    let analysis: {
        type: string;
        manufacturer: string;
        hex: string;
        safeEditStart: number | string;
        safeEditEnd: number | string;
        level: number | string;
        v2Element: { element: string; index: number; pattern: string } | null;
        bulletType: string | null;
    } | null = $state(null);
    let binary = $state('');
    let modifiedBinary = $state('');
    let selection = $state({ start: 0, end: 0 });
    let level: number | null = $state(null);
    let levelFoundAt: number | null = $state(null);

    let bulletType: string | null = $state(null);
    let bulletTypeHex: string | null = $state(null);
    let bulletTypeFoundAt: number | null = $state(null);
    let foundV2Element: { element: string; pattern: string; index: number } | null = $state(null);

    let newSerial = $state('');
    let modifiedBase85 = $state('');

    let deserializedText = '';
    let serialToDeserialize = '';

    async function deserialize() {
        try {
            const response = await fetch("/api/deserialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serial_b85: serialToDeserialize })
            });
            const data = await response.json();
            if (data.deserialized) {
                deserializedText = data.deserialized;
            } else {
                alert('Deserialization failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("Deserialization error:", error);
            alert('An error occurred during deserialization.');
        }
    }

    async function reserialize() {
        try {
            const response = await fetch("/api/reserialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deserialized: deserializedText })
            });
            const data = await response.json();
            if (data.serial_b85) {
                serialToDeserialize = data.serial_b85;
            } else {
                alert('Reserialization failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error("Reserialization error:", error);
            alert('An error occurred during reserialization.');
        }
    }

    const inputClasses = 'w-full p-3 bg-gray-900 text-gray-200 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm';
    const btnClasses = {
        primary: 'py-3 px-4 w-full font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed',
        secondary: 'py-2 px-4 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-all',
    };

    function decodeSerial() {
        if (!serial.startsWith('@U')) {
            alert('Invalid serial format. It must start with @U');
            return;
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

        // Bullet Type Pattern Detection (Hex)
        let foundBulletType: string | null = null;
        let foundBulletHex: string | null = null;
        let foundBulletIndex: number | null = null;
        for (const [type, patterns] of Object.entries(BULLET_TYPE_PATTERNS)) {
            for (const pattern of patterns) {
                const index = hex_data.indexOf(pattern);
                if (index !== -1) {
                    foundBulletType = type;
                    foundBulletHex = pattern;
                    foundBulletIndex = index;
                    break;
                }
            }
            if (foundBulletType) break;
        }
        bulletType = foundBulletType;
        bulletTypeHex = foundBulletHex;
        bulletTypeFoundAt = foundBulletIndex;

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
            bulletType: foundBulletType,
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

    function handleBulletTypeChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        const newBulletType = target.value;
        const newHex = BULLET_TYPE_PATTERNS[newBulletType][0];

        if (bulletTypeFoundAt !== null) {
            const newBinary = hexToBinary(newHex);
            const start = bulletTypeFoundAt * 4;
            const end = start + 16;
            const prefix = modifiedBinary.substring(0, start);
            const suffix = modifiedBinary.substring(end);
            modifiedBinary = prefix + newBinary + suffix;
            bulletType = newBulletType;
            bulletTypeHex = newHex;
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

    function modifyBits(modification: string) {
        const { start, end } = selection;
        if (start > end) {
            alert('Start index cannot be greater than end index.');
            return;
        }
        const prefix = modifiedBinary.substring(0, start);
        const suffix = modifiedBinary.substring(end);
        const selectedBits = modifiedBinary.substring(start, end);
        let newBits = '';
        switch (modification) {
            case 'zero':
                newBits = '0'.repeat(selectedBits.length);
                break;
            case 'one':
                newBits = '1'.repeat(selectedBits.length);
                break;
            case 'invert':
                newBits = selectedBits.split('').map(bit => (bit === '0' ? '1' : '0')).join('');
                break;
            case 'random':
                newBits = Array.from({ length: selectedBits.length }, () => Math.round(Math.random())).join('');
                break;
            default:
                newBits = selectedBits;
        }
        modifiedBinary = prefix + newBits + suffix;
    }

    $effect(() => {
        if (modifiedBinary) {
            modifiedBase85 = encodeSerial(modifiedBinary);
        }
    });
</script>

<Accordion title="🔧 Serial Editor" open={true}>
    <FormGroup label="Serial to Analyze">
        <textarea
            class={`${inputClasses} min-h-[80px]`}
            bind:value={serial}
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
            {#if analysis.bulletType}
                <p><strong>Bullet Type:</strong> {analysis.bulletType}</p>
            {/if}
            <p><strong>Hex:</strong> <span class="font-mono text-xs break-all">
                {#if bulletTypeFoundAt !== null && analysis.hex}
                    {analysis.hex.substring(0, bulletTypeFoundAt)}
                    <span class="bg-green-900 text-green-300">{analysis.hex.substring(bulletTypeFoundAt, bulletTypeFoundAt + 4)}</span>
                    {analysis.hex.substring(bulletTypeFoundAt + 4)}
                {:else}
                    {analysis.hex}
                {/if}
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

            {#if bulletType}
                <h3 class="text-lg font-semibold mt-2">Bullet Type Editor</h3>
                <FormGroup label="Bullet Type">
                    <select bind:value={bulletType} onchange={handleBulletTypeChange} class={inputClasses}>
                        {#each Object.keys(BULLET_TYPE_PATTERNS) as type}
                            <option value={type}>{type}</option>
                        {/each}
                    </select>
                </FormGroup>
            {/if}

            <h3 class="text-lg font-semibold mt-2">Binary Data Editor</h3>
            <div class="grid grid-cols-2 gap-4">
                <FormGroup label="Start Index">
                    <input type="number" name="start" bind:value={selection.start} onchange={handleSelectionChange} class={inputClasses} />
                </FormGroup>
                <FormGroup label="End Index">
                    <input type="number" name="end" bind:value={selection.end} onchange={handleSelectionChange} class={inputClasses} />
                </FormGroup>
            </div>
            <div class="grid grid-cols-4 gap-2 mt-2">
                <button onclick={() => modifyBits('zero')} class={btnClasses.secondary}>Set to 0</button>
                <button onclick={() => modifyBits('one')} class={btnClasses.secondary}>Set to 1</button>
                <button onclick={() => modifyBits('invert')} class={btnClasses.secondary}>Invert</button>
                <button onclick={() => modifyBits('random')} class={btnClasses.secondary}>Randomize</button>
            </div>
            <h3 class="text-lg font-semibold mt-2">Modified Binary Data</h3>
            <div class="font-mono text-xs p-3 bg-gray-900 border border-gray-700 rounded-md break-all">
                <span>{modifiedBinary.substring(0, selection.start)}</span
                ><span class="bg-blue-900 text-blue-300">{modifiedBinary.substring(selection.start, selection.end)}</span
                ><span>{modifiedBinary.substring(selection.end)}</span>
            </div>

            <FormGroup label="Serial to Deserialize">
                <textarea
                    class={`${inputClasses} min-h-[80px]`}
                    bind:value={serialToDeserialize}
                    placeholder="Paste serial here to deserialize..."
                ></textarea>
            </FormGroup>
            <button onclick={deserialize} class={btnClasses.secondary}>Deserialize</button>

            <h3 class="text-lg font-semibold mt-4">Deserializer/Reserializer</h3>
            <FormGroup label="Deserialized Text">
                <textarea
                    class={`${inputClasses} min-h-[120px]`}
                    bind:value={deserializedText}
                    placeholder="Deserialized output will appear here..."
                ></textarea>
            </FormGroup>
            <button onclick={reserialize} class={btnClasses.secondary}>Reserialize</button>

            {#if modifiedBase85}
                <div class="mt-4">
                    <h3 class="text-lg font-semibold">Modified Base85 Data</h3>
                    <textarea class={`${inputClasses} h-24`} readonly bind:value={modifiedBase85}></textarea>
                </div>
            {/if}
        </div>
    {/if}
</Accordion>
