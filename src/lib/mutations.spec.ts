import { describe, it, expect } from 'vitest';
import {
    appendMutation,
    shuffleAssetsMutation,
    randomizeAssetsMutation,
    repeatHighValuePartMutation,
    appendHighValuePartMutation,
} from './mutations';
import type { ParsedSerial, State } from './types';

const dummyState: State = {
    repository: '',
    seed: '',
    itemType: 'GUN',
    counts: { new: 0, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
    rules: {
        targetOffset: 60, // for appendHighValuePartMutation, 60/6 = 10 appends
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
    bitSize: 6,
};

describe('mutations', () => {
    it('appendMutation should add one asset', () => {
        const parsed: ParsedSerial = {
            preamble: '',
            assets: [{ value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 0 }],
            assets_fixed: [],
            assets_varint: [],
            trailer: '',
        };
        const newParsed = appendMutation(parsed, dummyState);
        expect(newParsed.assets.length).toBe(2);
    });

    it('shuffleAssetsMutation should contain the same assets', () => {
        const assets = [{ value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 0 }, { value: 2n, bitLength: 6, bits: [0,0,0,0,1,0], position: 6 }, { value: 3n, bitLength: 6, bits: [0,0,0,0,1,1], position: 12 }, { value: 4n, bitLength: 6, bits: [0,0,0,1,0,0], position: 18 }];
        const parsed: ParsedSerial = {
            preamble: '',
            assets: [...assets],
            assets_fixed: [...assets],
            assets_varint: [...assets],
            parsingMode: 'varint',
            trailer: '',
        };
        const newParsed = shuffleAssetsMutation(parsed, dummyState);
        expect(newParsed.assets.length).toBe(assets.length);
        expect(newParsed.assets.map(a => a.value).sort()).toEqual(assets.map(a => a.value).sort());
    });

    it('randomizeAssetsMutation should have the same number of assets', () => {
        const assets = [{ value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 0 }, { value: 2n, bitLength: 6, bits: [0,0,0,0,1,0], position: 6 }, { value: 3n, bitLength: 6, bits: [0,0,0,0,1,1], position: 12 }];
        const parsed: ParsedSerial = {
            preamble: '',
            assets: [...assets],
            assets_fixed: [...assets],
            assets_varint: [...assets],
            parsingMode: 'varint',
            trailer: '',
        };
        const newParsed = randomizeAssetsMutation(parsed, dummyState);
        expect(newParsed.assets.length).toBe(assets.length);
    });

    it('repeatHighValuePartMutation should add repeated assets', () => {
        const assets = [{ value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 0 }, { value: 2n, bitLength: 6, bits: [0,0,0,0,1,0], position: 6 }, { value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 12 }, { value: 3n, bitLength: 6, bits: [0,0,0,0,1,1], position: 18 }];
        const parsed: ParsedSerial = {
            preamble: '',
            assets: [...assets],
            assets_fixed: [...assets],
            assets_varint: [...assets],
            parsingMode: 'varint',
            trailer: '',
        };
        const newParsed = repeatHighValuePartMutation(parsed, dummyState);
        // it repeats 1 to 3 times, so length should be > 4
        expect(newParsed.assets.length).toBeGreaterThan(4);
        const count = newParsed.assets.filter(a => a.value === 1n).length;
        expect(count).toBeGreaterThan(2);
    });

    it('appendHighValuePartMutation should append assets', () => {
        const assets = [{ value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 0 }, { value: 2n, bitLength: 6, bits: [0,0,0,0,1,0], position: 6 }, { value: 1n, bitLength: 6, bits: [0,0,0,0,0,1], position: 12 }];
        const parsed: ParsedSerial = {
            preamble: '',
            assets: [...assets],
            assets_fixed: [...assets],
            assets_varint: [...assets],
            parsingMode: 'varint',
            trailer: '',
        };
        const newParsed = appendHighValuePartMutation(parsed, dummyState);
        // targetOffset is 60, so it should append 10 assets (or a random number up to 10)
        // The logic was changed to be random.
        expect(newParsed.assets.length).toBeGreaterThan(assets.length);
        const lastAsset = newParsed.assets[newParsed.assets.length - 1];
        // The appended asset should be the most frequent one, which is '000001'
        expect(lastAsset.value).toBe(1n);
    });
});
