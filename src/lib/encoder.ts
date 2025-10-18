import { ELEMENT_FLAG } from './utils';

const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function encodeBase85Bytes(bytes: number[]): string {
    let encoded = '';
    let i = 0;

    for (i = 0; i + 3 < bytes.length; i += 4) {
        let value = ((bytes[i] << 24) >>> 0) + ((bytes[i+1] << 16) >>> 0) + ((bytes[i+2] << 8) >>> 0) + bytes[i+3];
        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block;
    }

    if (i < bytes.length) {
        const remaining = bytes.length - i;
        let value = 0;
        for (let j = 0; j < remaining; j++) {
            value += bytes[i + j] << (8 * (3 - j));
        }

        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, remaining + 1);
    }

    return '@U' + encoded;
}

function encode(parsed: any): string {
    let binary = '';

    if (parsed.chunks) {
        parsed.chunks.forEach((c: any) => {
            if (c.chunk_type === 'standard') {
                binary += c.len_code.toString(2).padStart(4, '0');
                if (c.chunk_data) {
                    binary += c.chunk_data.bits;
                }
            } else if (c.chunk_type === 'raw') {
                binary += c.chunk_data.bits;
            }
        });
    }

    if (parsed.trailer_chunks) {
        parsed.trailer_chunks.forEach((c: any) => {
            if (c.chunk_type === 'raw') {
                binary += c.chunk_data.bits;
            }
        });
    }

    return binary;
}

export function parsedToSerial(parsed: any): string {
    let binary = '';
    if (parsed.type) {
        binary += parsed.type.bits;
    }
    
    if (parsed.header) {
        binary += parsed.header.bits;
    }

    if (parsed.prefix) {
        binary += parsed.prefix.bits;
    }

    binary += encode(parsed);

    if (parsed.v2_element) {
        const elementPart = ELEMENT_FLAG + parsed.v2_element.pattern;
        binary = binary.slice(0, 92 + parsed.v2_element.position) + elementPart + binary.slice(92 + parsed.v2_element.position);
    }

    const bytes: number[] = [];
    for (let i = 0; i < binary.length; i += 8) {
        let byteString = binary.substring(i, i + 8);
        if (byteString.length < 8) {
            byteString = byteString.padEnd(8, '0');
        }
        bytes.push(parseInt(byteString, 2));
    }

    const mirroredBytes = bytes.map(byte => {
        let mirrored = 0;
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                mirrored |= 1 << (7 - j);
            }
        }
        return mirrored;
    });

    return encodeBase85Bytes(mirroredBytes);
}
