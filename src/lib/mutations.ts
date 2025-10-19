
import type { ParsedSerial, State } from './types';
import { ALPHABET } from './constants';
import { BASE85_ALPHABET, getCharPoolForItemType, STABLE_MOTIFS } from './knowledge';
import { parse } from './parser';
import { serialToBinary } from './decode';

export interface Mutation {
    (parsedSerial: ParsedSerial, state: State): ParsedSerial;
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


export const appendMutation: Mutation = (parsedSerial, state) => {
    const newAssets = [...parsedSerial.assets];
    const assetToAdd = randomInt(0, 63).toString(2).padStart(6, '0');
    newAssets.push(assetToAdd);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const deleteMutation: Mutation = (parsedSerial, state) => {
    if (parsedSerial.assets.length > 1) {
        const newAssets = [...parsedSerial.assets];
        const indexToRemove = randomInt(0, newAssets.length - 1);
        newAssets.splice(indexToRemove, 1);

        return {
            ...parsedSerial,
            assets: newAssets,
        };
    }
    return parsedSerial;
};

export const shuffleAssetsMutation: Mutation = (parsedSerial, state) => {
    const newAssets = [...parsedSerial.assets];
    for (let i = newAssets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newAssets[i], newAssets[j]] = [newAssets[j], newAssets[i]];
    }
    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const randomizeAssetsMutation: Mutation = (parsedSerial, state) => {
    const newAssets = parsedSerial.assets.map(asset => {
        return randomInt(0, 63).toString(2).padStart(6, '0');
    });
    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

function createRandomRepeatingPart(minPartSize: number, maxPartSize: number, assetPool: number[]): string[] {
    const totalLength = randomInt(minPartSize, maxPartSize);
    const maxBaseLength = Math.max(1, Math.floor(totalLength / 2));
    const baseLength = randomInt(1, maxBaseLength);

    let basePart: string[] = [];
    for (let i = 0; i < baseLength; i++) {
        basePart.push(randomChoice(assetPool).toString(2).padStart(6, '0'));
    }

    let repeatedPart: string[] = [];
    while (repeatedPart.length < totalLength) {
        repeatedPart = repeatedPart.concat(basePart);
    }

    return repeatedPart.slice(0, totalLength);
}

export const stackedPartMutationV1: Mutation = (parsedSerial, state) => {
    const newAssets = [...parsedSerial.assets];
    const { minPart, maxPart } = state.rules;
    const assetPool = Array.from(Array(64).keys()); // Full range of assets

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const stackedPartMutationV2: Mutation = (parsedSerial, state) => {
    const newAssets = [...parsedSerial.assets];
    const { minPart, maxPart } = state.rules;

    const charPool = getCharPoolForItemType(state.itemType);
    const assetPool = charPool.map(c => BASE85_ALPHABET.indexOf(c)).filter(i => i !== -1);

    for (let i = 0; i < 2; i++) {
        const part = createRandomRepeatingPart(minPart, maxPart, assetPool);
        const injectPosition = randomInt(0, newAssets.length);
        newAssets.splice(injectPosition, 0, ...part);
    }

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

function motifToAssets(motif: string): string[] {
    return motif.split('').map(c => BASE85_ALPHABET.indexOf(c).toString(2).padStart(6, '0'));
}

export const evolvingMutation: Mutation = (parsedSerial, state) => {
    let newAssets = [...parsedSerial.assets];
    const { minChunk, maxChunk } = state.rules;

    // Motif Chaining
    if (Math.random() < 0.3) {
        let motifChain: string[] = [];
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

    // Asset Flips
    for (let i = 0; i < newAssets.length; i++) {
        if (Math.random() < 0.05) { // 5% chance
            newAssets[i] = randomInt(0, 63).toString(2).padStart(6, '0');
        }
    }

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const characterFlipMutation: Mutation = (parsedSerial, state) => {
    const newAssets = [...parsedSerial.assets];
    const motif = motifToAssets(randomChoice(STABLE_MOTIFS));
    const injectPosition = randomInt(0, newAssets.length);
    newAssets.splice(injectPosition, 0, ...motif);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const segmentReversalMutation: Mutation = (parsedSerial, state) => {

    const newAssets = [...parsedSerial.assets];

    for (let i = 0; i < 2; i++) {

        const motif = motifToAssets(randomChoice(STABLE_MOTIFS));

        const injectPosition = randomInt(0, newAssets.length);

        newAssets.splice(injectPosition, 0, ...motif);

    }



    return {

        ...parsedSerial,

        assets: newAssets,

    };

};



function extractHighValueParts(repoSerials: string[], minPartSize: number, maxPartSize: number): string[][] {

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



    return parts.sort((a, b) => b.length - a.length).map(motifToAssets);

}



export const partManipulationMutation: Mutation = (parsedSerial, state) => {

    const newAssets = [...parsedSerial.assets];

    const { legendaryChance, minPart, maxPart } = state.rules;

    const repository = state.repository.split(/[\s\n]+/).filter(s => s.startsWith('@U'));



    if (Math.random() < legendaryChance / 100 && repository.length > 0) {

        const highValueParts = extractHighValueParts(repository, minPart, maxPart);

        if (highValueParts.length > 0) {

            const part = randomChoice(highValueParts);

            const injectPosition = randomInt(0, newAssets.length);

            newAssets.splice(injectPosition, 0, ...part);

        }

    }



    return {

        ...parsedSerial,

        assets: newAssets,

    };

};



export const repositoryCrossoverMutation: Mutation = (parsedSerial, state) => {

    const newAssets = [...parsedSerial.assets];

    const repository = state.repository.split(/[\s\n]+/).filter(s => s.startsWith('@U'));



    if (repository.length > 0) {

        const otherSerial = randomChoice(repository);

        const otherParsed = parse(serialToBinary(otherSerial)); // Assuming serialToBinary is available

        const otherAssets = otherParsed.assets;



        if (otherAssets.length > 5) {

            const start = randomInt(0, newAssets.length - 5);

            const otherStart = randomInt(0, otherAssets.length - 5);

            const slice = otherAssets.slice(otherStart, otherStart + 5);

            newAssets.splice(start, 5, ...slice);

        }

    }



    return {

        ...parsedSerial,

        assets: newAssets,

    };

};

// Helper function to find repeating parts
function findRepeatingParts(assets: string[]): string[][] {
    const parts = new Map<string, number>();
    // This is O(n^3), might be slow for very long asset arrays.
    // Let's consider a max part length to keep it reasonable.
    const maxLength = Math.min(Math.floor(assets.length / 2), 10); // Max part length of 10 or half the array
    for (let len = 2; len <= maxLength; len++) { // Part length from 2 to maxLength
        for (let i = 0; i <= assets.length - len; i++) {
            const part = assets.slice(i, i + len);
            const partString = part.join(',');
            parts.set(partString, (parts.get(partString) || 0) + 1);
        }
    }

    const repeatingParts: string[][] = [];
    for (const [partString, count] of parts.entries()) {
        if (count > 1) {
            repeatingParts.push(partString.split(','));
        }
    }
    return repeatingParts;
}

// Helper function to find occurrences of a subarray.
function findOccurrences(arr: string[], subArr: string[]): number[] {
    const occurrences: number[] = [];
    for (let i = 0; i <= arr.length - subArr.length; i++) {
        let found = true;
        for (let j = 0; j < subArr.length; j++) {
            if (arr[i + j] !== subArr[j]) {
                found = false;
                break;
            }
        }
        if (found) {
            occurrences.push(i);
            i += subArr.length - 1; // Move to the next possible position after this match
        }
    }
    return occurrences;
}

export const repeatHighValuePartMutation: Mutation = (parsedSerial, state) => {
    const assets = parsedSerial.assets;
    const newAssets = [...assets];

    // 1. Find all repeating parts (subarrays) in the assets array.
    const parts = findRepeatingParts(assets);

    // 2. Filter out parts containing only '0's and select a "high value" one.
    const valuableParts = parts.filter(part => !part.every(p => parseInt(p, 2) === 0));
    if (valuableParts.length === 0) {
        return parsedSerial; // No valuable repeating parts found.
    }

    // Let's define "high value" as the longest part.
    valuableParts.sort((a, b) => b.length - a.length);
    const partToRepeat = valuableParts[0];

    // 3. Find all occurrences of this part in the asset array.
    const occurrences = findOccurrences(newAssets, partToRepeat);
    if (occurrences.length === 0) {
        return parsedSerial;
    }

    // 4. Choose a random occurrence to modify.
    const occurrenceIndex = randomChoice(occurrences);

    // 5. Decide whether to place it before or after.
    const placeBefore = Math.random() < 0.5;

    // 6. Decide how many times to repeat.
    const repeatCount = randomInt(1, 3); // Repeat 1 to 3 times.

    // 7. Insert the part.
    const insertIndex = placeBefore ? occurrenceIndex : occurrenceIndex + partToRepeat.length;
    
    const repeatedPart: string[] = [];
    for (let i = 0; i < repeatCount; i++) {
        repeatedPart.push(...partToRepeat);
    }
    newAssets.splice(insertIndex, 0, ...repeatedPart);

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};
