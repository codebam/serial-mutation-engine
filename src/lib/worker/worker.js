console.log('[DEBUG] Worker script loaded.');
self.postMessage({ type: 'worker_loaded' });

import { parseSerial } from '../parser';
import { encodeSerial } from '../encoder';
import * as coreMutations from '../mutations';
import { mergeSerials } from '../mutations';

self.onmessage = async function (e) {
    const { type, payload } = e.data;

    if (type === 'load_part_data') {
        const files = [
            'heavy_ordnance_firmware.json',
            'weapon_elemental.json',
            'harlowe_class_mods.json',
            'rafa_class_mods.json',
            'vex_class_mods.json',
            'regular_grenades.json',
            'legendary_grenades.json',
            'legendary_repkits.json',
            'repkits.json',
            'legendary_shields.json',
            'armor_shields.json',
            'energy_shields.json',
            'general_shields.json',
            'elemental_effects.json',
            'color_spray.json',
            'legendary_barrels.json'
        ];

        const allParts = [];
        const partMap = new Map();

        for (const file of files) {
            const response = await fetch(`/${file}`);
            const data = await response.json();
            const name = file.replace('.json', '');

            const key = Object.keys(data)[0];
            let items = data[key];

            if (name === 'regular_grenades') {
                if (items.type8) {
                    items.type8.forEach(item => {
                        const match = item.universalPart.match(/\{(\d+):\[(\d+)\]\}/);
                        if (match) {
                            const subType = parseInt(match[1]);
                            const index = parseInt(match[2]);
                            const partInfo = {
                                name: item.effect || item.perkType || item.name,
                                subType,
                                index,
                                fileName: name
                            };
                            allParts.push(partInfo);
                            if (!partMap.has(subType)) partMap.set(subType, new Map());
                            partMap.get(subType).set(index, partInfo);
                        }
                    });
                }
                if (items.type245) {
                    items.type245.forEach(item => {
                        const match = item.universalPart.match(/\{(\d+):(\d+)\}/);
                        if (match) {
                            const subType = parseInt(match[1]);
                            const index = parseInt(match[2]);
                            const partInfo = {
                                name: item.effect || item.perkType || item.name,
                                subType,
                                index,
                                fileName: name
                            };
                            allParts.push(partInfo);
                            if (!partMap.has(subType)) partMap.set(subType, new Map());
                            partMap.get(subType).set(index, partInfo);
                        }
                    });
                }
            } else if (Array.isArray(items)) {
                items.forEach(item => {
                    if (!item.universalPart) return;
                    const match = item.universalPart.match(/\{(\d+):(?:\|(\d+)\||(\d+))\}/) || item.universalPart.match(/\{(\d+):\[(\d+)(?: \d+)?\]\}/);
                    if (match) {
                        const subType = parseInt(match[1]);
                        const index = parseInt(match[2] || match[3]);
                        const partInfo = {
                            name: item.effect || item.perkType || item.name,
                            subType,
                            index,
                            fileName: name
                        };
                        allParts.push(partInfo);
                        if (!partMap.has(subType)) partMap.set(subType, new Map());
                        partMap.get(subType).set(index, partInfo);
                    }
                });
            } else if (typeof items === 'object') {
                for (const manufacturer in items) {
                    if(Array.isArray(items[manufacturer])) {
                        items[manufacturer].forEach(item => {
                            if (!item.universalPart) return;
                            const match = item.universalPart.match(/\{(\d+):(\d+)\}/);
                            if (match) {
                                const subType = parseInt(match[1]);
                                const index = parseInt(match[2]);
                                const partInfo = {
                                    name: item.perk || item.partName,
                                    subType,
                                    index,
                                    fileName: name
                                };
                                allParts.push(partInfo);
                                if (!partMap.has(subType)) partMap.set(subType, new Map());
                                partMap.get(subType).set(index, partInfo);
                            }
                        });
                    }
                }
            }
        }

        self.postMessage({
            type: 'part_data_loaded',
            payload: {
                allParts: allParts.sort((a, b) => {
                    if (a.name && b.name) {
                        return a.name.localeCompare(b.name);
                    }
                    return 0;
                }),
                partMap: partMap
            }
        });
    } else if (type === 'parse_serial') {
        try {
            const parsed = parseSerial(payload);
            self.postMessage({ type: 'parsed_serial', payload: { parsed } });
        } catch (e) {
            self.postMessage({ type: 'parsed_serial', payload: { error: e.message } });
        }
    } else if (type === 'encode_serial') {
        try {
            const serial = encodeSerial(payload);
            self.postMessage({ type: 'encoded_serial', payload: { serial } });
        } catch (e) {
            self.postMessage({ type: 'encoded_serial', payload: { error: e.message } });
        }
    } else if (type === 'generate') {
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

                if ((config.difficulties[item.tg] || 1) >= 1000) {
                    continue;
                }

                do {
                    if (innerAttempts > 0) {
                        config.difficulties[item.tg] = (config.difficulties[item.tg] || 1) + (config.rules.difficultyIncrement || 0.1);
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
                        payload: { stage: 'generating', processed: i + 1, total: totalRequested, mutation: item.tg, difficulty: config.difficulties[item.tg] }
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
