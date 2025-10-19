
import type { ParsedSerial, State } from './types';
import { ALPHABET } from './constants';
import { BASE85_ALPHABET, getCharPoolForItemType, STABLE_MOTIFS } from './knowledge';
import { parse } from './parser';
import { serialToBytes } from './decode';

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

        const otherParsed = parse(serialToBytes(otherSerial)); // Assuming serialToBytes is available

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

export const repeatHighValuePartMutation: Mutation = (parsedSerial, state) => {
    const assets = parsedSerial.assets;
    const newAssets = [...assets];

    // 1. Count occurrences of each asset value.
    const counts = new Map<string, number>();
    for (const asset of assets) {
        counts.set(asset, (counts.get(asset) || 0) + 1);
    }

    // 2. Find repeating assets, ignoring '0'.
    let repeatingAssets: { asset: string, count: number }[] = [];
    for (const [asset, count] of counts.entries()) {
        const assetValue = parseInt(asset, 2);
        if (count > 1 && assetValue !== 0) {
            repeatingAssets.push({ asset, count });
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
        return parseInt(b.asset, 2) - parseInt(a.asset, 2);
    });
    const assetToRepeat = repeatingAssets[0].asset;

    // 4. Find all indices of this asset.
    const indices = newAssets.map((a, i) => a === assetToRepeat ? i : -1).filter(i => i !== -1);
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
        newAssets.splice(insertIndex, 0, assetToRepeat);
    }

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};

export const appendHighValuePartMutation: Mutation = (parsedSerial, state) => {
    const assets = parsedSerial.assets;
    const newAssets = [...assets];

    // 1. Find high value asset
    const counts = new Map<string, { asset: string, count: number }>();
    for (const asset of assets) {
        const entry = counts.get(asset) || { asset, count: 0 };
        entry.count++;
        counts.set(asset, entry);
    }

    const allAssets = Array.from(counts.values());
    const nonZeroAssets = allAssets.filter(a => parseInt(a.asset, 2) !== 0);

    if (nonZeroAssets.length === 0) {
        return parsedSerial; // No non-zero assets to append
    }

    // Sort by count (desc), then by value (desc)
    nonZeroAssets.sort((a, b) => {
        if (b.count !== a.count) {
            return b.count - a.count;
        }
        return parseInt(b.asset, 2) - parseInt(a.asset, 2);
    });

    // Pick one from the top 5 (or fewer if there aren't that many)
    const topN = Math.min(5, nonZeroAssets.length);
    const selectedAssetInfo = nonZeroAssets[randomInt(0, topN - 1)];
    const assetToAppend = selectedAssetInfo.asset;

    // 2. Determine number of appends.
    const maxNumberOfAppends = Math.floor((state.rules.targetOffset || 0) / 6);
    const numberOfAppends = randomInt(1, Math.max(1, maxNumberOfAppends));

    // 3. Append the asset.
    const assetsToAppend = [];
    for (let i = 0; i < numberOfAppends; i++) {
        assetsToAppend.push(assetToAppend);
    }

    if (newAssets.length > 0 && parseInt(newAssets[newAssets.length - 1], 2) === 0) {
        // If last asset is 0, insert before it
        newAssets.splice(newAssets.length - 1, 0, ...assetsToAppend);
    } else {
        // Otherwise, append to the end
        newAssets.push(...assetsToAppend);
    }

    return {
        ...parsedSerial,
        assets: newAssets,
    };
};
