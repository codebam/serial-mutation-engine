import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import type { Serial, Block } from './types';
import {
	TOK_SEP1,
	TOK_SEP2,
	TOK_VARINT,
	TOK_VARBIT,
	TOK_PART,
	SUBTYPE_INT,
	SUBTYPE_LIST,
	SUBTYPE_NONE
} from './types';

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
						blockStr = `{${block.part.index}}`;
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
	const tokens: string[] = [];
	const regex = /(\d+)|(,)|(\|{1,2})|(\{[^}]+\})/g;
	let match;
	while ((match = regex.exec(custom)) !== null) {
		tokens.push(match[0]);
	}

	const newParsed: Serial = [];
	for (const token of tokens) {
		if (token === '|') {
			newParsed.push({ token: TOK_SEP1 });
		} else if (token === ',') {
			newParsed.push({ token: TOK_SEP2 });
		} else if (token === '||') {
			newParsed.push({ token: TOK_SEP1 });
			newParsed.push({ token: TOK_SEP1 });
		} else if (token.startsWith('{') && token.endsWith('}')) {
			const content = token.slice(1, -1);
			if (content.includes(':')) {
				const [indexStr, valueStr] = content.split(':');
				const index = parseInt(indexStr, 10);
				if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
					const valuesStr = valueStr.slice(1, -1);
					const values =
						valuesStr !== ''
							? valuesStr
									.split(' ')
									.map((v) => ({ type: bestTypeForValue(parseInt(v, 10)), value: parseInt(v, 10) }))
							: [];
					newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_LIST, index, values } });
				} else {
					const value = parseInt(valueStr, 10);
					newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_INT, index, value } });
				}
			} else {
				const value = parseInt(content, 10);
				if (!isNaN(value)) {
					newParsed.push({ token: TOK_PART, part: { subType: SUBTYPE_NONE, index: value } });
				}
			}
		} else {
			const value = parseInt(token, 10);
			if (!isNaN(value)) {
				newParsed.push({ token: bestTypeForValue(value), value });
			}
		}
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
