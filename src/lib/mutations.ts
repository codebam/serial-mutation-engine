import type { AssetToken, ParsedSerial, State } from './types';
import { ALPHABET } from './constants';
import { BASE85_ALPHABET, getCharPoolForItemType, STABLE_MOTIFS } from './knowledge';
import { parse } from './parser';
import { serialToBytes } from './decode';
import { valueToVarIntBits } from './utils';

export function getInitialState(): State {
    return {
        repository: '',
        seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
        itemType: 'GUN',
        counts: {
            appendMutation: 10000,
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
    (parsedSerial: ParsedSerial, state: State, selectedAsset?: AssetToken): ParsedSerial;
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function recalculateAssetPositions(assets: AssetToken[], startPosition: number, isVarInt: boolean, bitSize: number): AssetToken[] {
    let currentPosition = startPosition;
    return assets.map(asset => {
        let assetBitLength = asset.bitLength;
        if (isVarInt) {
            const bits = valueToVarIntBits(asset.value, bitSize);
            assetBitLength = bits.length;
        }
        
        if (assetBitLength === undefined) {
            assetBitLength = bitSize; // Fallback for fixed
        }

        const newAsset = { ...asset, position: currentPosition, bitLength: assetBitLength };
        currentPosition += assetBitLength;
        return newAsset;
    });
}

function createRandomRepeatingPart(minPartSize: number, maxPartSize: number, assetPool: number[], bitSize: number): AssetToken[] {
    const totalLength = randomInt(minPartSize, maxPartSize);
    const maxBaseLength = Math.max(1, Math.floor(totalLength / 2));
    const baseLength = randomInt(1, maxBaseLength);

    let basePart: AssetToken[] = [];
    for (let i = 0; i < baseLength; i++) {
        const value = BigInt(randomChoice(assetPool));
        basePart.push({ value, bitLength: bitSize, bits: [], position: 0 });
    }

    let repeatedPart: AssetToken[] = [];
    while (repeatedPart.length < totalLength) {
        repeatedPart = repeatedPart.concat(basePart);
    }

    return repeatedPart.slice(0, totalLength);
}

export const stackedPartMutationV1: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const { minPart, maxPart } = state.rules;
    const assetPool = Array.from(Array(64).keys()); // Full range of assets

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool, state.bitSize);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const stackedPartMutationV2: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const { minPart, maxPart } = state.rules;

    const charPool = getCharPoolForItemType(state.itemType);
    const assetPool = charPool.map(c => BASE85_ALPHABET.indexOf(c)).filter(i => i !== -1);

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool, state.bitSize);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

function motifToAssets(motif: string, bitSize: number): AssetToken[] {
    return motif.split('').map(c => ({ value: BigInt(BASE85_ALPHABET.indexOf(c)), bitLength: bitSize, bits: [], position: 0 }));
}

export const evolvingMutation: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const { minChunk, maxChunk } = state.rules;

    // Motif Chaining
    if (Math.random() < 0.3) {
        let motifChain: AssetToken[] = [];
        const chainCount = randomInt(2, 3);
        for (let i = 0; i < chainCount; i++) {
            motifChain = motifChain.concat(motifToAssets(randomChoice(STABLE_MOTIFS), state.bitSize));
        }
        if (newAssets.length > motifChain.length) {
            const injectPosition = randomInt(0, newAssets.length - motifChain.length);
            newAssets.splice(injectPosition, 0, ...motifChain);
        }
    }

    // Motif Injection
    if (Math.random() < 0.4) {
        const motif = motifToAssets(randomChoice(STABLE_MOTIFS), state.bitSize);
        if (newAssets.length > motif.length) {
            const injectPosition = randomInt(0, newAssets.length - motif.length);
            newAssets.splice(injectPosition, 0, ...motif);
        }
    }    // Segment Scramble
    const chunkSize = randomInt(minChunk, maxChunk);
    if (newAssets.length > chunkSize) {
        const start = randomInt(0, newAssets.length - chunkSize);
        const segment = newAssets.slice(start, start + chunkSize);
        segment.reverse();
        newAssets.splice(start, chunkSize, ...segment);
    }

    // Asset Flips
    for (let i = 0; i < newAssets.length; i++) {
        if (Math.random() < 0.05) { // 5% chance
            const maxValue = (1 << state.bitSize) - 1;
            newAssets[i] = { value: BigInt(randomInt(0, maxValue)), bitLength: state.bitSize, bits: [], position: 0 };
        }
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const characterFlipMutation: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const motif = motifToAssets(randomChoice(STABLE_MOTIFS), state.bitSize);
    const injectPosition = randomInt(0, newAssets.length);
    newAssets.splice(injectPosition, 0, ...motif);

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const segmentReversalMutation: Mutation = (parsedSerial, state) => {

    let newAssets = [...parsedSerial.assets];

    for (let i = 0; i < 2; i++) {

        const motif = motifToAssets(randomChoice(STABLE_MOTIFS), state.bitSize);

        const injectPosition = randomInt(0, newAssets.length);

        newAssets.splice(injectPosition, 0, ...motif);

    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {

        ...parsedSerial,

        assets: newAssets,

    };

};



function extractHighValueParts(repoSerials: string[], minPartSize: number, maxPartSize: number, bitSize: number): AssetToken[][] {

    const frequencyMap = new Map<string, number>();

    for (const serial of repoSerials) {

        const tail = serial.slice(13, -1); // Simplified tail extraction

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



    return parts.sort((a, b) => b.length - a.length).map(motif => motifToAssets(motif, bitSize));

}



export const partManipulationMutation: Mutation = (parsedSerial, state) => {

    let newAssets = [...parsedSerial.assets];

    const { legendaryChance, minPart, maxPart } = state.rules;

        const repository = state.repository.split(/[\s\n]+/).filter(s => s.startsWith('@U'));



    if (Math.random() < legendaryChance / 100 && repository.length > 0) {

        const highValueParts = extractHighValueParts(repository, minPart, maxPart, state.bitSize);

        if (highValueParts.length > 0) {

            const part = randomChoice(highValueParts);

            const injectPosition = randomInt(0, newAssets.length);

            newAssets.splice(injectPosition, 0, ...part);

        }

    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {

        ...parsedSerial,

        assets: newAssets,

    };

};



export const repositoryCrossoverMutation: Mutation = (parsedSerial, state) => {

    let newAssets = [...parsedSerial.assets];

        const repository = state.repository.split(/[\s\n]+/).filter(s => s.startsWith('@U'));



    if (repository.length > 0) {

        const otherSerial = randomChoice(repository);

        const otherParsed = parse(serialToBytes(otherSerial), parsedSerial.parsingMode, state.bitSize);

        const otherAssets = otherParsed.assets;



        if (otherAssets.length > 5) {

            const start = randomInt(0, newAssets.length - 5);

            const otherStart = randomInt(0, otherAssets.length - 5);

            const slice = otherAssets.slice(otherStart, otherStart + 5);

            newAssets.splice(start, 5, ...slice);

        }

    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {

        ...parsedSerial,

        assets: newAssets,

    };

};

export const appendMutation: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const maxValue = (1 << state.bitSize) - 1;
    const randomAsset: AssetToken = {
        value: BigInt(randomInt(0, maxValue)),
        bitLength: state.bitSize, // This is a placeholder for fixed size
        bits: [],
        position: 0 // This will be recalculated
    };
    newAssets.push(randomAsset);

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const shuffleAssetsMutation: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    for (let i = newAssets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newAssets[i], newAssets[j]] = [newAssets[j], newAssets[i]];
    }
    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);
    return { ...parsedSerial, assets: newAssets };
};

export const randomizeAssetsMutation: Mutation = (parsedSerial, state) => {
    let newAssets = parsedSerial.assets.map(() => {
        const maxValue = (1 << state.bitSize) - 1;
        return {
            value: BigInt(randomInt(0, maxValue)),
            bitLength: state.bitSize,
            bits: [],
            position: 0
        };
    });
    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);
    return { ...parsedSerial, assets: newAssets };
};

export const repeatHighValuePartMutation: Mutation = (parsedSerial, state) => {
    const assets = parsedSerial.assets;
    let newAssets = [...assets];

    // 1. Count occurrences of each asset value.
    const counts = new Map<bigint, number>();
    for (const asset of assets) {
        counts.set(asset.value, (counts.get(asset.value) || 0) + 1);
    }

    // 2. Find repeating assets, ignoring '0'.
    let repeatingAssets: { asset: AssetToken, count: number }[] = [];
    for (const [value, count] of counts.entries()) {
        if (count > 1 && value !== 0n) {
            const originalAsset = assets.find(a => a.value === value);
            if (originalAsset) {
                repeatingAssets.push({ asset: originalAsset, count });
            }
        }
    }

    if (repeatingAssets.length === 0) {
        return parsedSerial; // No repeating non-zero assets found.
    }

    // 3. Select a "high value" one. Let's pick the most frequent one.
    // If there's a tie in frequency, pick the one with the higher numeric value.
    repeatingAssets.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return Number(b.asset.value - a.asset.value);
    });
    const assetToRepeat = repeatingAssets[0].asset;

    // 4. Find all indices of this asset.
    const indices = newAssets.map((a, i) => a.value === assetToRepeat.value ? i : -1).filter(i => i !== -1);
    if (indices.length === 0) {
        return parsedSerial;
    }

    // 5. Choose a random occurrence to modify.
    const indexToModify = randomChoice(indices);

    // 6. Decide whether to place it before or after.
    const placeBefore = Math.random() < 0.5;

    // 7. Decide how many times to repeat.
    const repeatCount = randomInt(1, 3);

    // 8. Insert the asset.
    const insertIndex = placeBefore ? indexToModify : indexToModify + 1;
    for (let i = 0; i < repeatCount; i++) {
        newAssets.splice(insertIndex, 0, { ...assetToRepeat, bits: [] });
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const appendHighValuePartMutation: Mutation = (parsedSerial, state) => {
    const assets = parsedSerial.assets;
    let newAssets = [...assets];

    // 1. Find high value asset
    const counts = new Map<bigint, { asset: AssetToken, count: number }>();
    for (const asset of assets) {
        const entry = counts.get(asset.value) || { asset, count: 0 };
        entry.count++;
        counts.set(asset.value, entry);
    }

    const allAssets = Array.from(counts.values());
    const nonZeroAssets = allAssets.filter(a => a.asset.value !== 0n);

    if (nonZeroAssets.length === 0) {
        return parsedSerial; // No non-zero assets to append
    }

    // Sort by count (desc), then by value (desc)
    nonZeroAssets.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return Number(b.asset.value - a.asset.value);
    });

    const assetToAppend = nonZeroAssets[0].asset;

    // 2. Determine number of appends.
    const bitsPerCharacter = 8; // Approximate bits per character in the final encoded string
    const bitsPerAsset = state.bitSize;
    const maxNumberOfAppends = Math.floor(((state.rules.targetOffset || 0) * bitsPerCharacter) / bitsPerAsset);
    const numberOfAppends = randomInt(1, Math.max(1, maxNumberOfAppends));

    // 3. Append the asset.
    const assetsToAppend: AssetToken[] = [];
    for (let i = 0; i < numberOfAppends; i++) {
        assetsToAppend.push({ ...assetToAppend, bits: [] });
    }

    if (newAssets.length > 0 && newAssets[newAssets.length - 1].value === 0n) {
        // If last asset is 0, insert before it
        newAssets.splice(newAssets.length - 1, 0, ...assetsToAppend);
    } else {
        // Otherwise, append to the end
        newAssets.push(...assetsToAppend);
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};




export const appendSelectedAssetMutation: Mutation = (parsedSerial, state, selectedAsset) => {
    if (!selectedAsset) {
        return parsedSerial;
    }

    let newAssets = [...parsedSerial.assets];
    newAssets.push({ ...selectedAsset, bits: [] });

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
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

export const repeatSelectedAssetMutation: Mutation = (parsedSerial, state, selectedAsset) => {
    if (!selectedAsset) {
        return parsedSerial;
    }

    let newAssets = [...parsedSerial.assets];
    const indices = newAssets.map((a, i) => a.value === selectedAsset.value ? i : -1).filter(i => i !== -1);

    if (indices.length === 0) {
        return parsedSerial; // Should not happen if the asset was selected from the list
    }

    const indexToModify = randomChoice(indices);
    const placeBefore = Math.random() < 0.5;
    const repeatCount = randomInt(1, 3);
    const insertIndex = placeBefore ? indexToModify : indexToModify + 1;

    for (let i = 0; i < repeatCount; i++) {
        newAssets.splice(insertIndex, 0, { ...selectedAsset, bits: [] });
    }

    newAssets = recalculateAssetPositions(newAssets, parsedSerial.assets_start_pos, parsedSerial.isVarInt, state.bitSize);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};
