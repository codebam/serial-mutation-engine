import { StreamLanguage } from '@codemirror/language';
import { writeVarint, writeVarbit } from './encoder.ts';
import { BitstreamWriter } from './bitstream.ts';
import type { Serial, Block } from './types.ts';
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
} from './types.ts';

export const customFormatLanguage = StreamLanguage.define({
	token(stream) {
		if (stream.eatSpace()) return null;

		if (stream.match(/\d+/)) {
			return 'number';
		}

		if (stream.match(/[|]/)) {
			return 'operator';
		}

		if (stream.match(/[,]/)) {
			return 'operator';
		}

		if (stream.match(/[{}]/)) {
			return 'bracket';
		}

		if (stream.match(/[:]/)) {
			return 'operator';
		}

		if (stream.match(/[[\]]/)) {
			return 'bracket';
		}

		stream.next();
		return null;
	}
});

async function bestTypeForValue(v: number): Promise<number> {
	const streamVarint = new BitstreamWriter();
	await writeVarint(streamVarint, v);
	const lenVarint = streamVarint.written_bits;

	const streamVarbit = new BitstreamWriter();
	await writeVarbit(streamVarbit, v);
	const lenVarbit = streamVarbit.written_bits;

	if (lenVarint > lenVarbit) {
		return TOK_VARBIT;
	}
	return TOK_VARINT;
}

export async function parseCustomFormat(
	custom: string,
	passives?: Record<string, { id: number; name?: string }>
): Promise<Serial> {
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
			const partBlock = await parsePartString(partStr); // Reusing existing helper
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
			newParsed.push({ token: await bestTypeForValue(value), value });
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

export async function parsePartString(partStr: string): Promise<Block | null> {
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
				const values = await Promise.all(
					valuesStr !== ''
						? valuesStr.split(' ').map(async (v) => ({
								type: await bestTypeForValue(parseInt(v, 10)),
								value: parseInt(v, 10)
							}))
						: []
				);
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
