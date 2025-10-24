import { parseSerial } from '../parser';
import { encodeSerial } from '../encoder';
import * as coreMutations from '../mutations';
import { mergeSerials, type Mutation } from '../mutations';
import { parseCustomFormat } from '../custom_parser';
import type { RawPart, State } from '../types';

interface PartItem {
	name?: string;
	perk?: string;
	partName?: string;
	effect?: string;
	perkType?: string;
	universalPart: string;
}

interface PartJson {
	[key: string]: PartItem[] | { [manufacturer: string]: PartItem[] };
}

const mutationFunctions: Record<string, Mutation> = {};
for (const key in coreMutations) {
	const mutation = (coreMutations as any)[key];
	if (
		typeof mutation === 'function' &&
		key !== 'getInitialState' &&
		key !== 'mergeSerial' &&
		key !== 'mergeSerials'
	) {
		mutationFunctions[key] = mutation;
	}
}

self.onmessage = async function (e: MessageEvent<{ type: string; payload: any }>) {
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

		const allParts: RawPart[] = [];

		for (const file of files) {
			const response = await fetch(`/${file}`);
			const data = (await response.json()) as PartJson;
			const name = file.replace('.json', '');

			const key = Object.keys(data)[0];
			const items = data[key];

			if (Array.isArray(items)) {
				items.forEach((item: PartItem) => {
					if (!item.universalPart) return;
					allParts.push({
						name: item.effect || item.perkType || item.name || '',
						universalPart: item.universalPart,
						fileName: name
					});
				});
			} else if (typeof items === 'object') {
				for (const manufacturer in items) {
					if (Array.isArray(items[manufacturer])) {
						items[manufacturer].forEach((item: PartItem) => {
							if (!item.universalPart) return;
							allParts.push({
								name: item.name || item.perk || item.partName || '',
								universalPart: item.universalPart,
								fileName: name
							});
						});
					}
				}
			}
		}

		self.postMessage({
			type: 'part_data_loaded',
			payload: {
				rawParts: allParts
			}
		});
	} else if (type === 'parse_serial') {
		try {
			const parsed = parseSerial(payload);
			self.postMessage({ type: 'parsed_serial', payload: { parsed } });
		} catch (_e) {
			self.postMessage({ type: 'parsed_serial', payload: { error: (_e as Error).message } });
		}
	} else if (type === 'encode_serial') {
		try {
			const serial = encodeSerial(payload);
			self.postMessage({ type: 'encoded_serial', payload: { serial } });
		} catch (_e) {
			self.postMessage({ type: 'encoded_serial', payload: { error: (_e as Error).message } });
		}
	} else if (type === 'parse_pasted_content') {
		const content = payload;
		try {
			// 1. Try JSON
			const newParsed = JSON.parse(content);
			if (
				Array.isArray(newParsed) &&
				newParsed.every((item) => typeof item === 'object' && 'token' in item)
			) {
				self.postMessage({ type: 'pasted_content_parsed', payload: { parsed: newParsed } });
				return;
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (_e) {
			// Not JSON
		}

		// 2. Try Custom Format
		try {
			const newParsed = parseCustomFormat(content);
			if (newParsed && newParsed.length > 0) {
				self.postMessage({ type: 'pasted_content_parsed', payload: { parsed: newParsed } });
				return;
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (_e) {
			// Not custom format
		}

		self.postMessage({
			type: 'pasted_content_parsed',
			payload: { error: 'Invalid format. Please paste valid JSON or Custom Format.' }
		});
	} else if (type === 'generate') {
		const config = e.data.payload as State;
		try {
			const totalRequested = Object.values(config.counts).reduce(
				(sum: number, count: number) => sum + (count || 0),
				0
			);
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
			const selectedRepoSerials = repository.split(/\s+/).filter((s: string) => s.startsWith('@U'));

			if (selectedRepoSerials.length === 0) {
				selectedRepoSerials.push(config.seed);
			}

			const serialsToGenerate: { tg: string }[] = [];
			for (const [mutationName, count] of Object.entries(config.counts)) {
				for (let i = 0; i < (count || 0); i++) {
					serialsToGenerate.push({ tg: mutationName });
				}
			}

			const seenSerials = new Set();
			const generatedSerials: string[] = [];

			self.postMessage({
				type: 'progress',
				payload: { stage: 'generating', processed: 0, total: totalRequested }
			});

			for (let i = 0; i < totalRequested; i++) {
				const item = serialsToGenerate[i];
				let serial = '';
				let innerAttempts = 0;

				if ((config.difficulties[item.tg as keyof typeof config.difficulties] || 1) >= 1000) {
					continue;
				}

				do {
					if (innerAttempts > 0) {
						config.difficulties[item.tg as keyof typeof config.difficulties] =
							(config.difficulties[item.tg as keyof typeof config.difficulties] || 1) +
							(config.rules.difficultyIncrement || 0.1);
					}

					const parentSerialStr =
						selectedRepoSerials[Math.floor(Math.random() * selectedRepoSerials.length)];
					const parentSerial = parseSerial(parentSerialStr);

					const mutationFunc: Mutation = mutationFunctions[item.tg];
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
						payload: {
							stage: 'generating',
							processed: i + 1,
							total: totalRequested,
							mutation: item.tg,
							difficulty: config.difficulties[item.tg as keyof typeof config.difficulties]
						}
					});
				}
			}

			self.postMessage({ type: 'progress', payload: { stage: 'merging', processed: 0, total: 1 } });
			const { newYaml: finalYaml } = mergeSerials(config.baseYaml!, generatedSerials);
			self.postMessage({ type: 'progress', payload: { stage: 'merging', processed: 1, total: 1 } });

			self.postMessage({
				type: 'complete',
				payload: {
					yaml: finalYaml,
					truncatedYaml: finalYaml, // For now, no truncation
					uniqueCount: generatedSerials.length,
					totalRequested: totalRequested
				}
			});
		} catch (error) {
			console.error('Worker Error:', error);
			self.postMessage({
				type: 'error',
				payload: { message: (error as Error).message }
			});
		}
	}
};
