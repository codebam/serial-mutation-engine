console.log('[DEBUG] Worker script loaded.');
self.postMessage({ type: 'worker_loaded' });

import { parseSerial } from '../parser';
import { encodeSerial } from '../encoder';
import * as coreMutations from '../mutations';
import { mergeSerials } from '../mutations';

self.onmessage = async function (e) {
    const { type, payload } = e.data;

    if (type === 'generate') {
        const config = e.data.payload;
        try {
            const totalRequested = Object.values(config.counts).reduce((sum, count) => sum + count, 0);
            if (totalRequested === 0) {
                self.postMessage({
                    type: 'complete',
                    payload: {
                        yaml: 'No items requested.',
                        uniqueCount: 0,
                        totalRequested: 0
                    }
                });
                return;
            }

            const repository = config.repository || '';
            const selectedRepoSerials = repository
                .split(/\s+/)
                .filter((s) => s.startsWith('@U'));

            if (selectedRepoSerials.length === 0) {
                selectedRepoSerials.push(config.seed);
            }

            const serialsToGenerate = [];
            for (const [mutationName, count] of Object.entries(config.counts)) {
                for (let i = 0; i < count; i++) {
                    serialsToGenerate.push({ tg: mutationName });
                }
            }

            const seenSerials = new Set();
            const generatedSerials = [];

            self.postMessage({ type: 'progress', payload: { stage: 'generating', processed: 0, total: totalRequested } });

            for (let i = 0; i < totalRequested; i++) {
                const item = serialsToGenerate[i];
                let serial = '';
                let innerAttempts = 0;

                do {
                    if (innerAttempts > 0) {
                        config.difficulties[item.tg] = (config.difficulties[item.tg] || 1) + 0.1;
                    }

                    const parentSerialStr = selectedRepoSerials[Math.floor(Math.random() * selectedRepoSerials.length)];
                    const parentSerial = parseSerial(parentSerialStr);

                    const mutationFunc = coreMutations[item.tg];
                    if (!mutationFunc) {
                        serial = parentSerialStr;
                        break;
                    }

                    const mutatedSerial = mutationFunc(parentSerial, config);
                    serial = encodeSerial(mutatedSerial);

                    innerAttempts++;
                } while (seenSerials.has(serial) && innerAttempts < 20);

                if (!seenSerials.has(serial)) {
                    seenSerials.add(serial);
                    generatedSerials.push(serial);
                    selectedRepoSerials.push(serial);
                }
                if (i > 0 && i % 100 === 0) {
                    self.postMessage({
                        type: 'progress',
                        payload: { stage: 'generating', processed: i + 1, total: totalRequested, mutation: item.tg }
                    });
                }
            }

            self.postMessage({ type: 'progress', payload: { stage: 'merging', processed: 0, total: 1 } });
            const { newYaml: finalYaml } = mergeSerials(config.baseYaml, generatedSerials);
            self.postMessage({ type: 'progress', payload: { stage: 'merging', processed: 1, total: 1 } });


            self.postMessage({
                type: 'complete',
                payload: {
                    yaml: finalYaml,
                    truncatedYaml: finalYaml, // For now, no truncation
                    uniqueCount: generatedSerials.length,
                    totalRequested: totalRequested,
                }
            });

        } catch (error) {
            console.error('Worker Error:', error);
            self.postMessage({
                type: 'error',
                payload: { message: error.message }
            });
        }
    }
};