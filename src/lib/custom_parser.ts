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

export function toCustomFormat(
	p: Serial,
	useStringRepresentation?: boolean,
	passiveIdToName?: { [key: number]: string },
	classModIdToName?: { [key: number]: string },
	weaponPartIdToName?: { [key: number]: string },
	itemType?: string
): string {
	if (!p) return '';
	const parts: string[] = [];

	for (let i = 0; i < p.length; i++) {
		const block = p[i];
		let blockStr = '';

		if (
			useStringRepresentation &&
			i === 0 &&
			block.token === TOK_VARINT &&
			block.value !== undefined &&
			classModIdToName?.[block.value]
		) {
			blockStr = `"${classModIdToName[block.value]}"`;
		} else {
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
						if (
							useStringRepresentation &&
							itemType?.includes('Class Mod') &&
							block.part.subType === SUBTYPE_NONE &&
							passiveIdToName?.[block.part.index]
						) {
							const classModName = classModIdToName?.[p[0].value!];
							blockStr = `"${classModName}.${passiveIdToName[block.part.index]}"`;
						} else if (
							useStringRepresentation &&
							itemType?.includes('Weapon') &&
							block.part.subType === SUBTYPE_NONE &&
							weaponPartIdToName?.[block.part.index]
						) {
							blockStr = `"${weaponPartIdToName[block.part.index]}"`;
						} else if (block.part.subType === SUBTYPE_NONE) {
							if (block.part.index !== undefined) {
								blockStr = `{${block.part.index}}`;
							} else {
								blockStr = '{?}';
							}
						} else if (block.part.subType === SUBTYPE_INT) {
							blockStr = `{${block.part.index}:${block.part.value}}`;
						} else if (block.part.subType === SUBTYPE_LIST) {
							const values = block.part.values?.map((v) => v.value).join(' ') || '';
							blockStr = `{${block.part.index}:[${values}]}`;
						} else {
							blockStr = '{?}';
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
import { BitstreamWriter } from './bitstream';

function bestTypeForValue(v: number): number {
	const streamVarint = new BitstreamWriter(10);
	writeVarint(streamVarint, v);
	const lenVarint = streamVarint.bit_pos;

	const streamVarbit = new BitstreamWriter(10);
	writeVarbit(streamVarbit, v);
	const lenVarbit = streamVarbit.bit_pos;

	if (lenVarint > lenVarbit) {
		return TOK_VARBIT;
	}
	return TOK_VARINT;
}

export function parseCustomFormat(
	custom: string,
	passives?: Record<string, { id: number; name?: string }>
): Serial {
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

			let finalContent = content;

			const separatorIndex = content.indexOf('::');

			if (separatorIndex !== -1) {
				finalContent = content.substring(separatorIndex + 2);
			}

			if (passives) {
				const passive = passives[finalContent];

				if (passive) {
					newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_NONE, index: passive.id } });
				} else {
					newParsed.push({ token: TOK_STRING, valueStr: content });
				}
			} else {
				newParsed.push({ token: TOK_STRING, valueStr: content });
			}
			i = end + 1;
			continue;
		}
		throw new Error(`Invalid character: '${char}' at position ${i}`);
	}

	return newParsed;
}

export async function base85_to_deserialized(serial: string): Promise<string> {
	const parsed = await parseSerial(serial);
	return toCustomFormat(parsed, true);
}
export function deserialized_to_base85(
	custom: string,
	passives?: Record<string, { id: number; name?: string }>
): string {
	const parsed = parseCustomFormat(custom, passives);
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
