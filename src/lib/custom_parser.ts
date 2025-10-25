import { parseSerial } from './parser.js';
import { encodeSerial } from './encoder.js';
import type { Serial, Block } from './types.js';
import {
	TOK_SEP1,
	TOK_SEP2,
	TOK_VARINT,
	TOK_VARBIT,
	TOK_PART,
	TOK_STRING,
	SUBTYPE_INT,
	SUBTYPE_LIST,
	SUBTYPE_NONE
} from './types';

let passives: Record<string, number> = {};
let reversePassives: Record<number, string> = {};
let showPassiveName = false;

export function loadPassives(passivesData: Record<string, number>) {
	passives = passivesData;
	reversePassives = Object.fromEntries(Object.entries(passives).map(([key, value]) => [value, key]));
}

export function togglePassiveName(show: boolean) {
	showPassiveName = show;
}

function idToPassiveName(id: number): string | undefined {
	return reversePassives[id];
}

export function toCustomFormat(p: Serial): string {
	if (!p) return '';
	const parts: string[] = [];

	for (let i = 0; i < p.length; i++) {
		const block = p[i];
		let blockStr = '';

		switch (block.token) {
			case TOK_SEP1:
				blockStr = '|';
				break;
			case TOK_SEP2:
				blockStr = ',';
				break;
			case TOK_VARINT:
			case TOK_VARBIT:
				blockStr = String(block.value);
				break;
			case TOK_PART:
				if (block.part) {
					if (block.part.subType === SUBTYPE_NONE) {
						if (showPassiveName) {
							const passiveName = idToPassiveName(block.part.index || 0);
							if (passiveName) {
								blockStr = `"${passiveName}"`;
							} else {
								blockStr = `{${block.part.index}}`;
							}
						} else {
							blockStr = `{${block.part.index}}`;
						}
					}
					if (block.part.subType === SUBTYPE_INT) {
							blockStr = `{${block.part.index}:${block.part.value}}`;
					}
					if (block.part.subType === SUBTYPE_LIST) {
						const values = block.part.values?.map((v) => v.value).join(' ') || '';
						blockStr = `{${block.part.index}:[${values}]}`;
					}
				} else {
					blockStr = '{?}';
				}
				break;
            case TOK_STRING:
				if (block.valueStr !== undefined) {
					blockStr = `"${block.valueStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
				} else {
					blockStr = '""';
				}
				break;
			default:
				blockStr = '?';
				break;
		}
		parts.push(blockStr);
	}

	let result = '';
	for (let i = 0; i < parts.length; i++) {
		result += parts[i];
		if (i < parts.length - 1) {
			const current = parts[i];
			const next = parts[i + 1];

			if (current === ',') {
				result += ' ';
			} else if (current === '|') {
				if (next !== '|') {
					result += ' ';
				}
			} else if (next === ',' || next === '|') {
				// no space before separator
			} else {
				result += ' ';
			}
		}
	}

	return result.trim();
}

import { writeVarint, writeVarbit } from './encoder';
import { Bitstream } from './bitstream';

function bestTypeForValue(v: number): number {
	const streamVarint = new Bitstream(new Uint8Array(10));
	writeVarint(streamVarint, v);
	const lenVarint = streamVarint.bit_pos;

	const streamVarbit = new Bitstream(new Uint8Array(10));
	writeVarbit(streamVarbit, v);
	const lenVarbit = streamVarbit.bit_pos;

	if (lenVarint > lenVarbit) {
		return TOK_VARBIT;
	}
	return TOK_VARINT;
}

export function parseCustomFormat(custom: string): Serial {
	const newParsed: Serial = [];
	let i = 0;

	while (i < custom.length) {
		const char = custom[i];

		if (/\s/.test(char)) {
			i++;
			continue;
		}

		if (char === '|') {
			newParsed.push({ token: TOK_SEP1 });
			i++;
			continue;
		}

		if (char === ',') {
			newParsed.push({ token: TOK_SEP2 });
			i++;
			continue;
		}

		if (char === '{') {
			const end = custom.indexOf('}', i);
			if (end === -1) {
				throw new Error(`Unmatched '{' at position ${i}`);
			}
			const partStr = custom.substring(i, end + 1);
			const partBlock = parsePartString(partStr); // Reusing existing helper
			if (partBlock) {
				newParsed.push(partBlock);
			} else {
				throw new Error(`Invalid part format: '${partStr}'`);
			}
			i = end + 1;
			continue;
		}

		if (char >= '0' && char <= '9') {
			let numStr = '';
			while (i < custom.length && custom[i] >= '0' && custom[i] <= '9') {
				numStr += custom[i];
				i++;
			}
			const value = parseInt(numStr, 10);
			newParsed.push({ token: bestTypeForValue(value), value });
			continue;
		}

		if (char === '"') {
			let end = i + 1;
			let content = '';
			while (end < custom.length) {
				const current_char = custom[end];
				if (current_char === '"') {
					break; // end of string
				}
				if (current_char === '\\') {
					if (end + 1 < custom.length) {
						content += custom[end + 1];
						end += 2;
						continue;
					}
				}
				content += current_char;
				end++;
			}

			if (end >= custom.length || custom[end] !== '"') {
				throw new Error(`Unmatched '"' at position ${i}`);
			}

			newParsed.push({ token: TOK_STRING, valueStr: content });
			i = end + 1;
			continue;
		}

		throw new Error(`Invalid character: '${char}' at position ${i}`);
	}

	return newParsed;
}

export function base85_to_deserialized(serial: string): string {
	const parsed = parseSerial(serial);
	return toCustomFormat(parsed);
}

export function deserialized_to_base85(custom: string): string {
	const parsed = parseCustomFormat(custom);
	return encodeSerial(parsed);
}

export function parseHeavyOrdnancePartString(partStr: string): Block | null {
	if (partStr.startsWith('{') && partStr.endsWith('}')) {
		const content = partStr.slice(1, -1);
		const parts = content.split(':');

		if (parts.length === 2) {
			const subType = parseInt(parts[0], 10);
			const value = parseInt(parts[1], 10);
			if (!isNaN(subType) && !isNaN(value)) {
				return { token: TOK_PART, part: { subType: subType, index: 1, value } };
			}
		}
	}
	return null;
}

export function parsePartString(partStr: string): Block | null {
	if (partStr.startsWith('{') && partStr.endsWith('}')) {
		const content = partStr.slice(1, -1);
		const parts = content.split(':');

		if (parts.length === 1) {
			// SUBTYPE_NONE: {index}
			const index = parseInt(parts[0], 10);
			if (!isNaN(index)) {
				return { token: TOK_PART, part: { subType: SUBTYPE_NONE, index } };
			}
		} else if (parts.length === 2) {
			const index = parseInt(parts[0], 10);
			const valueStr = parts[1];
			if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
				// SUBTYPE_LIST: {index:[values]}
				const valuesStr = valueStr.slice(1, -1);
				const values =
					valuesStr !== ''
						? valuesStr
								.split(' ')
								.map((v) => ({ type: bestTypeForValue(parseInt(v, 10)), value: parseInt(v, 10) }))
						: [];
				return { token: TOK_PART, part: { subType: SUBTYPE_LIST, index, values } };
			} else {
				// SUBTYPE_INT: {index:value}
				const value = parseInt(valueStr, 10);
				if (!isNaN(index) && !isNaN(value)) {
					return { token: TOK_PART, part: { subType: SUBTYPE_INT, index, value } };
				}
			}
		}
	}
	return null;
}
