import { parseSerial } from './parser.js';
import { encodeSerial } from './encoder.js';
import type { Serial, Block, Part } from './types.js';
import { TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART, SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from './types.js';

function toCustomFormat(p: Serial): string {
    if (!p) return '';
    const firstPartIndex = p.findIndex(block => block.token === TOK_PART);
    return p.map((block, index) => {
        switch (block.token) {
            case TOK_SEP1:
                return '|';
            case TOK_SEP2:
                return ',';
            case TOK_VARINT:
            case TOK_VARBIT:
                if (firstPartIndex === -1 || index < firstPartIndex) {
                    return block.value;
                }
                return `{${block.value}}`;
            case TOK_PART:
                if (block.part) {
                    if (block.part.subType === SUBTYPE_NONE) {
                        return `{${block.part.index}}`;
                    }
                    if (block.part.subType === SUBTYPE_INT) {
                        return `{${block.part.index}:${block.part.value}}`;
                    }
                    if (block.part.subType === SUBTYPE_LIST) {
                        const values = block.part.values?.map(v => v.value).join(' ') || '';
                        return `{${block.part.index}:[${values}]}`;
                    }
                }
                return '{?}';
            default:
                return '?';
        }
    }).join(' ');
}

function parseCustomFormat(custom: string): Serial {
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
