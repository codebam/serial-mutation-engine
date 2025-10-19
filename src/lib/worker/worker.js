
import { DEFAULT_SEED, TG_FLAGS, RANDOM_SAFETY_MARGIN } from '../constants';
import { setupWebGPU, generateRandomNumbersOnGPU, needsRandomNumberGeneration, getGpuDevice } from './gpu.js';
import { randomChoice, ensureCharset, splitHeaderTail, extractHighValueParts } from './utils.js';
import { calculateHighValuePartsStats } from './stats.js';

import { parse } from '../parser';
import { parsedToSerial } from '../encoder';
import * as mutations from '../mutations';

let debugMode = false; // Global debug flag

// --- ASYNC WORKER MESSAGE HANDLER ---
self.onmessage = async function (e) {
	const { type, payload } = e.data;
    // This is the most reliable place to set the debug flag.
    debugMode = payload && payload.debugMode;

	console.log(`[DEBUG] Worker received message of type: ${type}. Debug mode is ${debugMode ? 'ENABLED' : 'DISABLED'}.`);

    if (type === 'generate') {
        const config = e.data.payload;
        if (debugMode) console.log('[DEBUG] Received generation config:', config);
        try {
            if (!getGpuDevice()) await setupWebGPU();
            const totalRequested = config.newCount + config.newV1Count + config.newV2Count + config.newV3Count + config.tg1Count + config.tg2Count + config.tg3Count + config.tg4Count;
            console.log(`[DEBUG] Total serials requested: ${totalRequested}`);
            if (totalRequested === 0) {
                self.postMessage({
                    type: 'complete',
                    payload: {
                        yaml: 'No items requested.',
                    
uniqueCount: 0,
                    totalRequested: 0,
                    },
                });
                return;
            }
            await generateRandomNumbersOnGPU(config.gpuBatchSize);
            const [baseHeader, baseTail] = splitHeaderTail(config.seed || DEFAULT_SEED);
            console.log(`[DEBUG] Seed parsed into Header: "${baseHeader}" and Tail: "${baseTail.substring(0, 20)}"... (length: ${baseTail.length})`);

            const repository = config.repository || '';
            const selectedRepoTails = repository
                .split(/[\s\n]+/
)
                .filter(/** @param {string} s */ (s) => s.startsWith('@U'))
                .map(/** @param {string} s */ (s) => splitHeaderTail(s)[1]);
            if (selectedRepoTails.length === 0) {
                console.log('[DEBUG] No repository tails found, using base seed tail as parent.');
                selectedRepoTails.push(baseTail);
            } else {
                console.log(`[DEBUG] Loaded ${selectedRepoTails.length} tails from the repository.`);
            }

            const highValueParts = extractHighValueParts(selectedRepoTails, config.minPartSize, config.maxPartSize);
            const legendaryStackingChance = config.legendaryChance / 100.0;

            /** @param {any[]} array */
            const shuffleArray = (array) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
            };

            const serialsToGenerate = [];
            for (let i = 0; i < config.newCount; i++) serialsToGenerate.push({ tg: 'NEW_V0' });
            for (let i = 0; i < config.newV1Count; i++) serialsToGenerate.push({ tg: 'NEW_V1' });
            for (let i = 0; i < config.newV2Count; i++) serialsToGenerate.push({ tg: 'NEW_V2' });
            for (let i = 0; i < config.newV3Count; i++) serialsToGenerate.push({ tg: 'NEW_V3' });
            for (let i = 0; i < config.tg1Count; i++) serialsToGenerate.push({ tg: 'TG1' });
            for (let i = 0; i < config.tg2Count; i++) serialsToGenerate.push({ tg: 'TG2' });
            for (let i = 0; i < config.tg3Count; i++) serialsToGenerate.push({ tg: 'TG3' });
            for (let i = 0; i < config.tg4Count; i++) serialsToGenerate.push({ tg: 'TG4' });
            shuffleArray(serialsToGenerate); // Shuffle the generation order

            const seenSerials = new Set();
            const generatedSerials = [];
            console.log('[DEBUG] Starting generation loop...');

            const headerLength = baseHeader.length;
            const adjustedMutableStart = Math.max(0, config.mutableStart - headerLength);
            const adjustedMutableEnd = Math.max(0, config.mutableEnd - headerLength);

            for (let i = 0; i < totalRequested; i++) {
                if (needsRandomNumberGeneration(RANDOM_SAFETY_MARGIN)) await generateRandomNumbersOnGPU(config.gpuBatchSize);

                const item = serialsToGenerate[i];
                let serial = '';
                let innerAttempts = 0;
                let mutatedTail;

                if (debugMode && i < 10) console.log(`\n[DEBUG] --- Generating Serial #${i + 1} (Type: ${item.tg}) ---`);

                do {
                    const parentTail = randomChoice(selectedRepoTails);
                    const protectedStartLength = adjustedMutableStart;
                    let dynamicTargetLength = Math.floor(baseTail.length + config.targetOffset);
                    dynamicTargetLength = Math.max(dynamicTargetLength, protectedStartLength);

                                    const parsedSerial = parse(baseTail);

                    const mutationMap = {
                        'NEW_V0': mutations.appendMutation,
                        'NEW_V1': mutations.stackedPartMutationV1,
                        'NEW_V2': mutations.stackedPartMutationV2,
                        'NEW_V3': mutations.evolvingMutation,
                        'TG1': mutations.characterFlipMutation,
                        'TG2': mutations.segmentReversalMutation,
                        'TG3': mutations.partManipulationMutation,
                        'TG4': mutations.repositoryCrossoverMutation,
                    };

                    const mutation = mutationMap[item.tg] || mutations.appendMutation;
                    const mutatedParsedSerial = mutation(parsedSerial, config);

                    mutatedTail = parsedToSerial(mutatedParsedSerial);

                    serial = ensureCharset(baseHeader + mutatedTail);
                    innerAttempts++;
                    if (innerAttempts > 1 && debugMode) console.warn(`[DEBUG] Collision detected. Retrying... (Attempt ${innerAttempts})`);
                } while (seenSerials.has(serial) && innerAttempts < 20);

                if (!seenSerials.has(serial)) {
                    seenSerials.add(serial);
                    const flagValue = /** @type {any} */ (TG_FLAGS)[item.tg] || 0;
                    generatedSerials.push({
                        serial: serial,
                        flag: flagValue !== 0 ? 1 : 0,
                        state_flag: flagValue,
                    slot: generatedSerials.length,
                    });
                }
                if (i > 0 && i % 500 === 0)
                    self.postMessage({
                        type: 'progress',
                        payload: { processed: i + 1, total: totalRequested },
                    });
            }
            console.log(`[DEBUG] Generation loop finished. Generated ${generatedSerials.length} unique serials.`);

            const fullLines = ['state:', '  inventory:', '    items:', '      backpack:'];
            generatedSerials.forEach((item) => {
                fullLines.push(`        slot_${item.slot}:`);
                fullLines.push(`          serial: '${item.serial}'`);
                if (item.flag === 1) fullLines.push(`          flags: 1`);
                if (item.state_flag !== 0) fullLines.push(`          state_flags: ${item.state_flag}`);
            });
            const fullYaml = fullLines.join('\n');

            const truncatedSerials = generatedSerials.slice(0, 30000);
            const truncatedLines = ['state:', '  inventory:', '    items:', '      backpack:'];
            truncatedSerials.forEach((item) => {
                truncatedLines.push(`        slot_${item.slot}:`);
                truncatedLines.push(`          serial: '${item.serial}'`);
                if (item.flag === 1) truncatedLines.push(`          flags: 1`);
                if (item.state_flag !== 0) truncatedLines.push(`          state_flags: ${item.state_flag}`);
            });
            const truncatedYaml = truncatedLines.join('\n');		// --- DECOUPLED MESSAGES ---
            // 1. Send YAML data immediately for UI responsiveness
            console.log('[DEBUG] Sending YAML output to main thread.');
            self.postMessage({
                type: 'complete',
                payload: {
                    yaml: fullYaml,
                    truncatedYaml: truncatedYaml,
                
uniqueCount: generatedSerials.length,
                    totalRequested: totalRequested,
                    validationResult: null,
                },
            });

            // 2. If stats are enabled, calculate and send them in a separate message
            if (config.generateStats && generatedSerials.length > 0) {
                console.log('[DEBUG] Calculating and sending statistics.');
                self.postMessage({ type: 'progress', payload: { processed: 0, total: 100, stage: 'stats' } });
                /** @param {number} progress */
                const onProgress = (progress) => {
                    self.postMessage({ type: 'progress', payload: { processed: progress, total: 100, stage: 'stats' } });
                };
                const serialStrings = generatedSerials.map((s) => s.serial);
                const highValueParts = calculateHighValuePartsStats(serialStrings, config.minPartSize, config.maxPartSize, onProgress);
                let sortedParts = highValueParts.sort((a, b) => b[1] - a[1]);
                const maxBars = 200;
                if (sortedParts.length > maxBars) {
                    sortedParts = sortedParts.slice(0, maxBars);
                }
                const chartData = {
                    labels: sortedParts.map((p) => p[0]),
                    data: sortedParts.map((p) => p[1]),
                };
                self.postMessage({
                    type: 'stats_complete',
                    payload: { chartData: chartData },
                });
            }
        } catch (error) {
            console.error('Worker Error:', error);
            self.postMessage({ type: 'error', payload: { message: /** @type {Error} */ (error).message } });
        }
    } else if (type === 'generate_from_editor') {
        console.log('[DEBUG] Entering generate_from_editor handler.');
        try {
            const { parsedSerial, originalAssetsCount, generationCount, mutationName, rules } = payload;
            console.log(`[DEBUG] generationCount: ${generationCount}, mutationName: ${mutationName}`);
            const mutation = mutations[mutationName];

            if (!mutation) {
                throw new Error(`Unknown mutation: ${mutationName}`);
            }

            const newSerials = new Map();
            const dummyState = {
                repository: '',
                seed: '',
                itemType: 'GUN',
                counts: { new: 0, newV1: 0, newV2: 0, newV3: 0, tg1: 0, tg2: 0, tg3: 0, tg4: 0 },
                rules: rules || {
                    targetOffset: 0,
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
            };
            
            const maxAttempts = generationCount * 5;
            let attempts = 0;

            while (newSerials.size < generationCount && attempts < maxAttempts) {
                let newParsedOutput = mutation(JSON.parse(JSON.stringify(parsedSerial)), dummyState);
                let assetKey = newParsedOutput.assets.join('');

                if (newSerials.has(assetKey)) {
                    // Duplicate assets, apply "add-nudge"
                    const assetsToNudge = newParsedOutput.assets;
                    if (assetsToNudge.length > 0) {
                        const indexToNudge = Math.floor(Math.random() * assetsToNudge.length);
                        let value = parseInt(assetsToNudge[indexToNudge], 2);
                        
                        if (Math.random() < 0.5) {
                            value = (value + 1) % 64;
                        } else {
                            value = (value - 1 + 64) % 64;
                        }
                        const newAsset = value.toString(2).padStart(6, '0');
                        
                        assetsToNudge.splice(indexToNudge + 1, 0, newAsset);
                        
                        newParsedOutput.assets = assetsToNudge;
                        assetKey = newParsedOutput.assets.join('');
                    }
                }
                newSerials.set(assetKey, newParsedOutput);
                attempts++;

                if (attempts % 100 === 0) {
                     console.log(`[DEBUG] Progress: ${newSerials.size} / ${generationCount}`);
                     self.postMessage({ type: 'generate_from_editor_progress', payload: { generated: newSerials.size, total: generationCount } });
                }
            }

            const finalSerials = [];
            for (const newParsedOutput of newSerials.values()) {
                const lengthDifference = (newParsedOutput.assets.length - originalAssetsCount) * 6;

                if (newParsedOutput.level && newParsedOutput.level.position > newParsedOutput.preamble.length) {
                    newParsedOutput.level.position += lengthDifference;
                }
                if (newParsedOutput.manufacturer && newParsedOutput.manufacturer.position > newParsedOutput.preamble.length) {
                    newParsedOutput.manufacturer.position += lengthDifference;
                }

                const newSerial = parsedToSerial(newParsedOutput);
                finalSerials.push(newSerial);
            }

            console.log(`[DEBUG] Generation loop finished. Generated ${finalSerials.length} serials.`);
            self.postMessage({ type: 'generate_from_editor_complete', payload: { serials: finalSerials } });

        } catch (error) {
            console.error('Error in generate_from_editor:', error);
            self.postMessage({ type: 'error', payload: { message: error.message } });
        }
    }
};
