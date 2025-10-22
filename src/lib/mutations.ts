import { TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2, TOK_UNSUPPORTED_111 } from './types';
import { parseSerial} from './parser';

export function getInitialState(): any {
    return {
        repository: '',
        seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
        counts: {
            appendRandomAsset: 0,
            injectRepeatingPart: 0,
            injectRepeatingPartFull: 0,
            scrambleAndAppendFromRepo: 0,
            injectRandomAsset: 0,
            reverseRandomSegments: 0,
            injectHighValuePart: 0,
            crossoverWithRepository: 0,
            shuffleAssets: 0,
            randomizeAssets: 0,
            repeatHighValuePart: 0,
            appendHighValuePart: 0
        },
        rules: {
            targetOffset: 200,
            minChunk: 1,
            maxChunk: 1,
            minPart: 1,
            maxPart: 1,
            legendaryChance: 100,
            difficultyIncrement: 0.1,
        },
        difficulties: {
            appendRandomAsset: 1,
            injectRepeatingPart: 1,
            injectRepeatingPartFull: 1,
            scrambleAndAppendFromRepo: 1,
            injectRandomAsset: 1,
            reverseRandomSegments: 1,
            injectHighValuePart: 1,
            crossoverWithRepository: 1,
            shuffleAssets: 1,
            randomizeAssets: 1,
            repeatHighValuePart: 1,
            appendHighValuePart: 1,
        },
        generateStats: false,
        debugMode: false,
    };
}

export interface Mutation {
    (serial: Serial, state?: any): Serial;
}

function randomInt(min: number, max: number): number {
    const range = max - min + 1;
    const random_array = new Uint32Array(1);
    crypto.getRandomValues(random_array);
    return Math.floor(random_array[0] / (0xFFFFFFFF + 1) * range) + min;
}

function randomChoice<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)];
}

function blocksToValues(blocks: Block[]): number[] {
    const values: number[] = [];
    for (const block of blocks) {
        if (block.token === TOK_VARINT || block.token === TOK_VARBIT) { // Use imported constants
            values.push(block.value!);
        }
    }
    return values;
}

function valuesToBlocks(values: number[]): Block[] {
    return values.map(value => ({
        token: TOK_VARINT, // Use imported constant
        value
    }));
}

export const appendRandomAsset: Mutation = (serial, state) => {
    const difficulty = state.difficulties.appendRandomAsset || 1;
    const numberOfAppends = Math.floor(difficulty);
    const newBlocks: Block[] = [];
    for (let i = 0; i < numberOfAppends; i++) {
        newBlocks.push({
            token: 4, // VARINT
            value: randomInt(0, 100)
        });
    }
    return [...serial, ...newBlocks];
};

function createRandomRepeatingPart(minPartSize: number, maxPartSize: number, assetPool: number[]): number[] {
    const totalLength = randomInt(minPartSize, maxPartSize);
    const maxBaseLength = Math.max(1, Math.floor(totalLength / 2));
    const baseLength = randomInt(1, maxBaseLength);

    let basePart: number[] = [];
    for (let i = 0; i < baseLength; i++) {
        basePart.push(randomChoice(assetPool));
    }

    let repeatedPart: number[] = [];
    while (repeatedPart.length < totalLength) {
        repeatedPart = repeatedPart.concat(basePart);
    }

    return repeatedPart.slice(0, totalLength);
}

export const injectRepeatingPart: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minPart, maxPart } = state.rules;
    const difficulty = state.difficulties.injectRepeatingPart || 1;
    const assetPool = Array.from(Array(64).keys()); // Full range of assets

    const numberOfParts = 2 + Math.floor(difficulty / 100);
    for (let i = 0; i < numberOfParts; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return valuesToBlocks(newAssets);
};

export const scrambleAndAppendFromRepo: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minChunk, maxChunk, targetOffset } = state.rules;
    const difficulty = state.difficulties.scrambleAndAppendFromRepo || 1;

    // Segment Scramble
    const chunkSize = randomInt(minChunk, maxChunk);
    if (newAssets.length > chunkSize) {
        const start = randomInt(0, newAssets.length - chunkSize);
        const segment = newAssets.slice(start, start + chunkSize);
        segment.reverse();
        newAssets.splice(start, chunkSize, ...segment);
    }

    // Append assets from repository
    const repository = state.repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));
    if (repository.length > 0) {
        const otherSerialStr = randomChoice(repository);
        const otherSerialAssets = blocksToValues(parseSerial(otherSerialStr));
        const quarterLength = Math.floor(otherSerialAssets.length * 0.25);
        const lastQuarter = otherSerialAssets.slice(otherSerialAssets.length - quarterLength);

        if (lastQuarter.length > 0) {
            const bitsPerCharacter = 8;
            const bitsPerAsset = 8;
            const maxNumberOfAppends = Math.floor(((targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
            const numberOfAppends = Math.min(Math.floor(difficulty), maxNumberOfAppends);

            for (let i = 0; i < numberOfAppends; i++) {
                const assetToAppend = randomChoice(lastQuarter);
                newAssets.push(assetToAppend);
            }
        }
    }

    return valuesToBlocks(newAssets);
};

export const injectRepeatingPartFull: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minPart, maxPart } = state.rules;
    const difficulty = state.difficulties.injectRepeatingPartFull || 1;

    const assetPool = Array.from(Array(85).keys()); // Full range of assets

    const numberOfParts = 2 + Math.floor(difficulty / 100);
    for (let i = 0; i < numberOfParts; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return valuesToBlocks(newAssets);
};
export const injectRandomAsset: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const difficulty = state.difficulties.injectRandomAsset || 1;
    const numberOfFlips = Math.floor(difficulty);

    for (let i = 0; i < numberOfFlips; i++) {
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, randomInt(0, 84));
    }

    return valuesToBlocks(newAssets);
};
export const reverseRandomSegments: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minChunk, maxChunk } = state.rules;
    const difficulty = state.difficulties.reverseRandomSegments || 1;
    const numberOfReversals = 1 + Math.floor(difficulty / 100);

    for (let i = 0; i < numberOfReversals; i++) {
        const chunkSize = randomInt(minChunk, maxChunk);
        if (newAssets.length > chunkSize) {
            const start = randomInt(0, newAssets.length - chunkSize);
            const segment = newAssets.slice(start, start + chunkSize);
            segment.reverse();
            newAssets.splice(start, chunkSize, ...segment);
        }
    }

    return valuesToBlocks(newAssets);
};
function extractHighValueParts(repoSerials: string[], minPartSize: number, maxPartSize: number): number[][] {
    const frequencyMap = new Map<string, number>();

    for (const serial of repoSerials) {
        const values = blocksToValues(parseSerial(serial));
        const tail = values.map(v => String.fromCharCode(v + 48)).join('');

        for (let size = minPartSize; size <= maxPartSize; size++) {
            if (tail.length < size) continue;

            for (let i = 0; i <= tail.length - size; i++) {
                const fragment = tail.substring(i, i + size);
                frequencyMap.set(fragment, (frequencyMap.get(fragment) || 0) + 1);
            }
        }
    }

    let parts = [...frequencyMap.entries()].filter(([, count]) => count > 1).map(([part]) => part);

    let changed = true;
    while (changed) {
        changed = false;
        const consolidated = new Set<string>();
        parts.sort((a, b) => b.length - a.length);

        for (const part of parts) {
            let isContained = false;
            for (const biggerPart of consolidated) {
                if ((biggerPart + biggerPart).includes(part)) {
                    isContained = true;
                    break;
                }
            }
            if (!isContained) {
                consolidated.add(part);
            }
        }

        if (consolidated.size !== parts.length) {
            parts = [...consolidated];
            changed = true;
        }
    }

    return [...parts].sort((a, b) => b.length - a.length).map(motif => motif.split('').map(c => c.charCodeAt(0) - 48));
}

export const injectHighValuePart: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];

    const { legendaryChance, minPart, maxPart } = state.rules;
    const difficulty = state.difficulties.injectHighValuePart || 1;
    const numberOfInjections = 1 + Math.floor(difficulty / 100);

    const repository = state.repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));

    if (Math.random() < legendaryChance / 100 && repository.length > 0) {
        const highValueParts = extractHighValueParts(repository, minPart, maxPart);

        if (highValueParts.length > 0) {
            for (let i = 0; i < numberOfInjections; i++) {
                const part = randomChoice(highValueParts);
                const injectPosition = randomInt(0, newAssets.length);
                newAssets.splice(injectPosition, 0, ...part);
            }
        }
    }

    return valuesToBlocks(newAssets);
};

export const crossoverWithRepository: Mutation = (serial, state) => {
    const repository = state.repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));
    const difficulty = state.difficulties.crossoverWithRepository || 1;
    const sliceSize = 5 + Math.floor(difficulty / 100);

    if (repository.length > 0) {
        const otherSerialStr = randomChoice(repository);
        const otherSerial = parseSerial(otherSerialStr);

        const selfValues = blocksToValues(serial);
        const otherValues = blocksToValues(otherSerial);

        if (otherValues.length > sliceSize) {
            const start = randomInt(0, selfValues.length - sliceSize);
            const otherStart = randomInt(0, otherValues.length - sliceSize);
            const slice = otherValues.slice(otherStart, otherStart + sliceSize);
            selfValues.splice(start, sliceSize, ...slice);
        }

        return valuesToBlocks(selfValues);
    }
    return serial;
};

export const shuffleAssets: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const difficulty = state.difficulties.shuffleAssets || 1;
    const shufflePercentage = Math.min(10 + difficulty, 100) / 100;
    const numberToShuffle = Math.floor(newAssets.length * shufflePercentage);

    for (let i = 0; i < numberToShuffle; i++) {
        const j = randomInt(0, newAssets.length - 1);
        const k = randomInt(0, newAssets.length - 1);
        [newAssets[j], newAssets[k]] = [newAssets[k], newAssets[j]];
    }
    return valuesToBlocks(newAssets);
};
export const randomizeAssets: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const difficulty = state.difficulties.randomizeAssets || 1;
    const randomizePercentage = Math.min(10 + difficulty, 100) / 100;
    const numberToRandomize = Math.floor(newAssets.length * randomizePercentage);

    for (let i = 0; i < numberToRandomize; i++) {
        const randomIndex = randomInt(0, newAssets.length - 1);
        newAssets[randomIndex] = randomInt(0, 84);
    }
    return valuesToBlocks(newAssets);
};
export const repeatHighValuePart: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];

    // 1. Count occurrences of each asset value.
    const counts = new Map<number, number>();
    for (const asset of newAssets) {
        counts.set(asset, (counts.get(asset) || 0) + 1);
    }

    // 2. Find repeating assets, ignoring '0'.
    let repeatingAssets: { asset: number, count: number }[] = [];
    for (const [value, count] of counts.entries()) {
        if (count > 1 && value !== 0) {
            repeatingAssets.push({ asset: value, count });
        }
    }

    if (repeatingAssets.length === 0) {
        const nonZeroAssets = newAssets.filter(a => a !== 0);
        if (nonZeroAssets.length === 0) {
            return serial; // No non-zero assets to repeat
        }
        const assetToRepeat = randomChoice(nonZeroAssets);
        const indices = newAssets.map((a, i) => a === assetToRepeat ? i : -1).filter(i => i !== -1);
        if (indices.length === 0) {
            return serial;
        }
        const indexToModify = randomChoice(indices);
        const placeBefore = Math.random() < 0.5;
        const bitsPerCharacter = 8;
        const bitsPerAsset = 8;
        const maxNumberOfRepeats = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
        const repeatCount = randomInt(1, Math.max(1, maxNumberOfRepeats));
        const insertIndex = placeBefore ? indexToModify : indexToModify + 1;
        for (let i = 0; i < repeatCount; i++) {
            newAssets.splice(insertIndex, 0, assetToRepeat);
        }
        return valuesToBlocks(newAssets);
    }

    // 3. Select a "high value" one. Let's pick the most frequent one.
    // If there's a tie in frequency, pick the one with the higher numeric value.
    repeatingAssets.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return b.asset - a.asset;
    });
    const assetToRepeat = repeatingAssets[0].asset;

    // 4. Find all indices of this asset.
    const indices = newAssets.map((a, i) => a === assetToRepeat ? i : -1).filter(i => i !== -1);
    if (indices.length === 0) {
        return serial;
    }

    // 5. Choose a random occurrence to modify.
    const indexToModify = randomChoice(indices);

    // 6. Decide whether to place it before or after.
    const placeBefore = Math.random() < 0.5;

    const bitsPerCharacter = 8;
    const bitsPerAsset = 8;
    const difficulty = state.difficulties.repeatHighValuePart || 1;
    const maxNumberOfRepeats = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
    const repeatCount = randomInt(1, Math.max(1, maxNumberOfRepeats)) * Math.floor(difficulty);

    const insertIndex = placeBefore ? indexToModify : indexToModify + 1;
    for (let i = 0; i < repeatCount; i++) {
        newAssets.splice(insertIndex, 0, assetToRepeat);
    }

    return valuesToBlocks(newAssets);
};
export const appendHighValuePart: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];

    // 1. Find high value asset
    const counts = new Map<number, { asset: number, count: number }>();
    for (const asset of newAssets) {
        const entry = counts.get(asset) || { asset, count: 0 };
        entry.count++;
        counts.set(asset, entry);
    }

    const allAssets = Array.from(counts.values());
    const nonZeroAssets = allAssets.filter(a => a.asset !== 0);

    if (nonZeroAssets.length === 0) {
        return serial; // No non-zero assets to append
    }

    // Sort by count (desc), then by value (desc)
    nonZeroAssets.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return b.asset - a.asset;
    });

    const assetToAppend = nonZeroAssets[0].asset;

    // 2. Determine number of appends.
    const bitsPerCharacter = 8; // Approximate bits per character in the final encoded string
    const bitsPerAsset = 8;
    const difficulty = state.difficulties.appendHighValuePart || 1;
    const maxNumberOfAppends = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
    const numberOfAppends = randomInt(1, Math.max(1, maxNumberOfAppends)) * Math.floor(difficulty);

    // 3. Append the asset.
    const assetsToAppend: number[] = [];
    for (let i = 0; i < numberOfAppends; i++) {
        assetsToAppend.push(assetToAppend);
    }

    newAssets.push(...assetsToAppend);

    return valuesToBlocks(newAssets);
};
export const appendSelectedAssetMutation: Mutation = (serial, state) => {
    if (!state.selectedAsset) {
        return serial;
    }
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    newAssets.push(state.selectedAsset);

    return valuesToBlocks(newAssets);
};
export const repeatSelectedAssetMutation: Mutation = (serial, state) => {
    if (!state.selectedAsset) {
        return serial;
    }
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const indices = newAssets.map((a, i) => a === state.selectedAsset ? i : -1).filter(i => i !== -1);

    if (indices.length === 0) {
        return serial; // Should not happen if the asset was selected from the list
    }

    const indexToModify = randomChoice(indices);
    const placeBefore = Math.random() < 0.5;
    const repeatCount = randomInt(1, 3);
    const insertIndex = placeBefore ? indexToModify : indexToModify + 1;

    for (let i = 0; i < repeatCount; i++) {
        newAssets.splice(insertIndex, 0, state.selectedAsset);
    }

    return valuesToBlocks(newAssets);
};

export function mergeSerial(yaml: string, serialToInsert: string): { newYaml: string, message: string } {
    const { newYaml, message } = mergeSerials(yaml, [serialToInsert]);
    return { newYaml, message: message.replace('1 serials', 'serial') };
}

export function mergeSerials(yaml: string, serialsToInsert: string[]): { newYaml: string, message: string } {
    if (!yaml) {
        return { newYaml: '', message: 'Please select a base YAML file first.' };
    }

    if (serialsToInsert.length === 0) {
        return { newYaml: yaml, message: 'No serials to merge.' };
    }

    const lines = yaml.split('\n');
    let backpackIndex = lines.findIndex(line => line.trim().startsWith('backpack:'));

    if (backpackIndex === -1) {
        // Case 1: No backpack section, add one to the end
        const newStructure = [
            'state:',
            '  inventory:',
            '    items:',
            '      backpack:',
            ...serialsToInsert.flatMap((s, i) => [
                `        slot_${i}:`,
                `          serial: '${s}'`
            ])
        ];
        const newYaml = (yaml.trim() === '' ? '' : yaml + '\n') + newStructure.join('\n');
        return { newYaml, message: '✅ Created new backpack structure and merged serials.' };
    }

    const backpackLine = lines[backpackIndex];
    const backpackIndent = backpackLine.search(/\S/);

    if (backpackLine.trim() === 'backpack: null') {
        // Case 2: backpack: null, replace it
        const indent = ' '.repeat(backpackIndent);
        const newSlotLines = serialsToInsert.flatMap((s, i) => [
            `${indent}  slot_${i}:`,
            `${indent}    serial: '${s}'`
        ]);
        lines.splice(backpackIndex, 1, `${indent}backpack:`, ...newSlotLines);
        return { newYaml: lines.join('\n'), message: `✅ Merged ${serialsToInsert.length} serials into new backpack.` };
    }

    // Case 3: Existing backpack section
    let lastSlot = -1;
    let lastSlotLineIndex = -1;

    for (let i = backpackIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const lineIndent = line.search(/\S/);

        if (line.trim() !== '' && lineIndent <= backpackIndent) {
            break; // End of backpack section
        }

        const slotMatch = line.match(/^\s*slot_(\d+):/);
        if (slotMatch) {
            lastSlot = Math.max(lastSlot, parseInt(slotMatch[1], 10));
            lastSlotLineIndex = i;
        }
    }

    let insertionIndex;
    let indent;

    if (lastSlotLineIndex !== -1) {
        const lastSlotIndent = lines[lastSlotLineIndex].search(/\S/);
        indent = ' '.repeat(lastSlotIndent);
        insertionIndex = lastSlotLineIndex + 1;

        // Find the end of the last slot's content
        for (let i = lastSlotLineIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineIndent = line.search(/\S/);
            if (line.trim() !== '' && lineIndent <= lastSlotIndent) {
                insertionIndex = i;
                break;
            }
            insertionIndex = i + 1;
        }

    } else {
        // No slots in the backpack yet
        indent = ' '.repeat(backpackIndent + 2);
        insertionIndex = backpackIndex + 1;
    }

    const startSlotNum = lastSlot + 1;
    const newSlotLines = serialsToInsert.flatMap((s, i) => [
        `${indent}slot_${startSlotNum + i}:`,
        `${indent}  serial: '${s}'`
    ]);

    lines.splice(insertionIndex, 0, ...newSlotLines);
    const newYaml = lines.join('\n');
    return { newYaml, message: `✅ Merged ${serialsToInsert.length} serials.` };
}
