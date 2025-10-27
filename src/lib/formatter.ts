import type { Serial } from './types.ts';
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
						blockStr = `"${block.valueStr.replace(/\\/g, '\\').replace(/"/g, '"')}"`;
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
