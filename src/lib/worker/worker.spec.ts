

import { describe, it, expect } from 'vitest';
import Worker from './worker.js?worker';

import type { State } from '../types';

const dummyState: State = {
    repository: '',
    seed: '@Uge9B?m/)}}!ffxLNwtrrhUgJFvP19)9>F7c1drg69->2ZNDt8=I>e4x5g)=u;D`>fBRx?3?tmf{sYpdCQjv<(7NJN*DpHY(R3rc',
    itemType: 'GUN',
    counts: {
        appendMutation: 10,
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


describe('Web Worker Generation', () => {
    it('should generate 10 serials using appendMutation', async () => {
        const worker = new Worker();

        const config = {
            ...dummyState,
            counts: { appendMutation: 10 },
            gpuBatchSize: 100000, // A reasonable number for the test
        };

        worker.postMessage({ type: 'generate', payload: config });

        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Worker test timed out'));
            }, 10000); // 10 second timeout

            worker.onmessage = (e) => {
                if (e.data.type === 'complete') {
                    clearTimeout(timeout);
                    resolve(e.data.payload);
                } else if (e.data.type === 'error') {
                    clearTimeout(timeout);
                    reject(new Error(e.data.payload.message));
                }
            };
        });

        expect(result.uniqueCount).toBe(10);
        expect(result.totalRequested).toBe(10);
        expect(result.yaml).toContain('slot_9');
        expect(result.yaml).not.toContain('slot_10');
    }, 15000);
});
