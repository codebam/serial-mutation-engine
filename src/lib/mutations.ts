import type { Serial, Block,  TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_SEP1, TOK_SEP2, TOK_UNSUPPORTED_111 } from './types';
import { parseSerial} from './parser';

export function getInitialState(): any {
    return {
        repository: '',
        seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
        itemType: 'GUN',
        counts: {
            appendMutation: 0,
            stackedPartMutationV1: 0,
            stackedPartMutationV2: 0,
            evolvingMutation: 0,
            characterFlipMutation: 0,
            segmentReversalMutation: 0,
            partManipulationMutation: 0,
            repositoryCrossoverMutation: 0,
            shuffleAssetsMutation: 0,
            randomizeAssetsMutation: 0,
            repeatHighValuePartMutation: 0,
            appendHighValuePartMutation: 0
        },
        rules: {
            targetOffset: 200,
            mutableStart: 13,
            mutableEnd: 13,
            minChunk: 3,
            maxChunk: 7,
            targetChunk: 5,
            minPart: 4,
            maxPart: 8,
            legendaryChance: 100,
        },
        generateStats: false,
        debugMode: false,
        bitSize: 6,
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

export const appendMutation: Mutation = (serial) => {
    const newBlock: Block = {
        token: 4, // VARINT
        value: randomInt(0, 100)
    };
    return [...serial, newBlock];
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

export const stackedPartMutationV1: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minPart, maxPart } = state.rules;
    const assetPool = Array.from(Array(64).keys()); // Full range of assets

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return valuesToBlocks(newAssets);
};
import { getCharPoolForItemType, BASE85_ALPHABET, STABLE_MOTIFS } from './knowledge';

function motifToAssets(motif: string): number[] {
    return motif.split('').map(c => BASE85_ALPHABET.indexOf(c));
}

export const evolvingMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minChunk, maxChunk } = state.rules;

    // Motif Chaining
    if (Math.random() < 0.3) {
        let motifChain: number[] = [];
        const chainCount = randomInt(2, 3);
        for (let i = 0; i < chainCount; i++) {
            motifChain = motifChain.concat(motifToAssets(randomChoice(STABLE_MOTIFS)));
        }
        if (newAssets.length > motifChain.length) {
            const injectPosition = randomInt(0, newAssets.length - motifChain.length);
            newAssets.splice(injectPosition, 0, ...motifChain);
        }
    }

    // Motif Injection
    if (Math.random() < 0.4) {
        const motif = motifToAssets(randomChoice(STABLE_MOTIFS));
        if (newAssets.length > motif.length) {
            const injectPosition = randomInt(0, newAssets.length - motif.length);
            newAssets.splice(injectPosition, 0, ...motif);
        }
    }

    // Segment Scramble
    const chunkSize = randomInt(minChunk, maxChunk);
    if (newAssets.length > chunkSize) {
        const start = randomInt(0, newAssets.length - chunkSize);
        const segment = newAssets.slice(start, start + chunkSize);
        segment.reverse();
        newAssets.splice(start, chunkSize, ...segment);
    }

    return valuesToBlocks(newAssets);
};

export const stackedPartMutationV2: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const { minPart, maxPart } = state.rules;

    const charPool = getCharPoolForItemType(state.itemType);
    const assetPool = charPool.map(c => BASE85_ALPHABET.indexOf(c)).filter(i => i !== -1);

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return valuesToBlocks(newAssets);
};
export const characterFlipMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    const motif = motifToAssets(randomChoice(STABLE_MOTIFS));
    const injectPosition = randomInt(0, newAssets.length);
    newAssets.splice(injectPosition, 0, ...motif);

    return valuesToBlocks(newAssets);
};
export const segmentReversalMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];

    for (let i = 0; i < 2; i++) {
        const motif = motifToAssets(randomChoice(STABLE_MOTIFS));
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...motif);
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

export const partManipulationMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];

    const { legendaryChance, minPart, maxPart } = state.rules;

    const repository = state.repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));

    if (Math.random() < legendaryChance / 100 && repository.length > 0) {
        const highValueParts = extractHighValueParts(repository, minPart, maxPart);

        if (highValueParts.length > 0) {
            const part = randomChoice(highValueParts);
            const injectPosition = randomInt(0, newAssets.length);
            newAssets.splice(injectPosition, 0, ...part);
        }
    }

    return valuesToBlocks(newAssets);
};

export const repositoryCrossoverMutation: Mutation = (serial, state) => {
    const repository = state.repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));
    if (repository.length > 0) {
        const otherSerialStr = randomChoice(repository);
        const otherSerial = parseSerial(otherSerialStr);

        const selfValues = blocksToValues(serial);
        const otherValues = blocksToValues(otherSerial);

        if (otherValues.length > 5) {
            const start = randomInt(0, selfValues.length - 5);
            const otherStart = randomInt(0, otherValues.length - 5);
            const slice = otherValues.slice(otherStart, otherStart + 5);
            selfValues.splice(start, 5, ...slice);
        }

        return valuesToBlocks(selfValues);
    }
    return serial;
};

export const shuffleAssetsMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = [...assetList];
    for (let i = newAssets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newAssets[i], newAssets[j]] = [newAssets[j], newAssets[i]];
    }
    return valuesToBlocks(newAssets);
};
export const randomizeAssetsMutation: Mutation = (serial, state) => {
    const assetList = blocksToValues(serial);
    let newAssets = assetList.map(() => {
        const maxValue = (1 << state.bitSize) - 1;
        return randomInt(0, maxValue);
    });
    return valuesToBlocks(newAssets);
};
export const repeatHighValuePartMutation: Mutation = (serial, state) => {
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
        return serial; // No repeating non-zero assets found.
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
    const bitsPerAsset = state.bitSize;
    const maxNumberOfRepeats = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
    const repeatCount = randomInt(1, Math.max(1, maxNumberOfRepeats));

    const insertIndex = placeBefore ? indexToModify : indexToModify + 1;
    for (let i = 0; i < repeatCount; i++) {
        newAssets.splice(insertIndex, 0, assetToRepeat);
    }

    return valuesToBlocks(newAssets);
};
export const appendHighValuePartMutation: Mutation = (serial, state) => {
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
    const bitsPerAsset = state.bitSize;
    const maxNumberOfAppends = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
    const numberOfAppends = randomInt(1, Math.max(1, maxNumberOfAppends));

    // 3. Append the asset.
    const assetsToAppend: number[] = [];
    for (let i = 0; i < numberOfAppends; i++) {
        assetsToAppend.push(assetToAppend);
    }

    if (newAssets.length > 0 && newAssets[newAssets.length - 1] === 0) {
        // If last asset is 0, insert before it
        newAssets.splice(newAssets.length - 1, 0, ...assetsToAppend);
    } else {
        // Otherwise, append to the end
        newAssets.push(...assetsToAppend);
    }

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

export function mergeSerial(currentYaml: string, baseYaml: string, serialToInsert: string): { newYaml: string, message: string } {
    if (!baseYaml) {
        return { newYaml: currentYaml, message: 'Please select a base YAML file first.' };
    }

    let yaml = currentYaml || baseYaml;

    if (yaml.includes('backpack: null')) {
        const backpackLine = yaml.split('\n').find(line => line.trim() === 'backpack: null');
        const indent = ' '.repeat(backpackLine!.search(/\S/));
        const newBackpackString = [
            `${indent}backpack:`,
            `${indent}  slot_0:`,
            `${indent}    serial: '${serialToInsert}'`
        ].join('\n');
        const newYaml = yaml.replace(backpackLine!, newBackpackString);
        return { newYaml, message: `✅ Merged serial into new backpack.` };
    } else if (yaml.includes('backpack:')) {
        let lines = yaml.split('\n');
        let backpackIndex = -1;
        let backpackIndent = -1;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === 'backpack:') {
                backpackIndex = i;
                backpackIndent = lines[i].search(/\S/);
                break;
            }
        }

        let lastSlot = -1;
        let endOfBackpackIndex = -1;

        for (let i = backpackIndex + 1; i < lines.length; i++) {
            if (lines[i].trim() !== '' && lines[i].search(/\S/) <= backpackIndent) {
                endOfBackpackIndex = i;
                break;
            }
            const slotMatch = lines[i].match(/^\s*slot_(\d+):/);
            if (slotMatch) {
                lastSlot = Math.max(lastSlot, parseInt(slotMatch[1], 10));
            }
        }
        if (endOfBackpackIndex === -1) {
            endOfBackpackIndex = lines.length;
        }

        const nextSlotNum = lastSlot + 1;
        const indent = ' '.repeat(backpackIndent + 2);
        const newSlotLines = [
            `${indent}slot_${nextSlotNum}:`,
            `${indent}  serial: '${serialToInsert}'`
        ];

        lines.splice(endOfBackpackIndex, 0, ...newSlotLines);
        const newYaml = lines.join('\n');
        return { newYaml, message: `✅ Merged serial into slot_${nextSlotNum}.` };
    } else {
        const newStructure = [
            'state:',
            '  inventory:',
            '    items:',
            '      backpack:',
            '        slot_0:',
            `          serial: '${serialToInsert}'`
        ];
        const newYaml = (yaml.trim() === '' ? '' : yaml + '\n') + newStructure.join('\n');
        return { newYaml, message: '✅ Created new backpack structure and merged serial.' };
    }
}
