import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import type { Serial, Block, Part } from './types';
import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART, SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from './types';

function toCustomFormat(p: Serial): string {
    if (!p) return '';
    const parts: string[] = [];
    const firstPartIndex = p.findIndex(block => block.token === TOK_PART);

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
                if (firstPartIndex === -1 || i < firstPartIndex) {
                    blockStr = String(block.value);
                } else {
                    blockStr = `{${block.value}}`;
                }
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
                        const values = block.part.values?.map(v => v.value).join(' ') || '';
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
        const currentPart = parts[i];
        const nextPart = i < parts.length - 1 ? parts[i+1] : null;

        const currentIsSeparator = currentPart === '|' || currentPart === ',';
        const nextIsSeparator = nextPart === '|' || nextPart === ',';

        result += currentPart;

        if (i < parts.length - 1) {
            if (currentIsSeparator && nextIsSeparator) {
                // No space between consecutive separators
                continue;
            } else if (currentIsSeparator) {
                // Space after a separator if not followed by another separator
                result += ' ';
            } else if (!nextIsSeparator) {
                // Space between non-separator assets
                result += ' ';
            }
        }
    }

    return result.trim();
}

function parseCustomFormat(custom: string): Serial {
    // This function needs to be updated to handle the new spacing format
    // For now, it will remain as is, assuming input will be space-separated
    const tokens = custom.split(' ');
    const newParsed: Serial = [];
    for (const token of tokens) {
        if (token === '|') {
            newParsed.push({ token: TOK_SEP1 });
        } else if (token === ',') {
            newParsed.push({ token: TOK_SEP2 });
        } else if (token.startsWith('{') && token.endsWith('}')) {
            const content = token.slice(1, -1);
            if (content.includes(':')) {
                const [indexStr, valueStr] = content.split(':');
                const index = parseInt(indexStr, 10);
                if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                    const valuesStr = valueStr.slice(1, -1);
                    const values = valuesStr !== '' ? valuesStr.split(' ').map(v => ({ type: TOK_VARINT, value: parseInt(v, 10) })) : [];
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
                newParsed.push({ token: TOK_VARINT, value });
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