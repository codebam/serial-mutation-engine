import { MANUFACTURER_PATTERNS } from './utils';

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
        const lastChunk = bytes.slice(i);
        while (lastChunk.length < 4) {
            lastChunk.push(0);
        }
        let value = ((lastChunk[0] << 24) >>> 0) + ((lastChunk[1] << 16) >>> 0) + ((lastChunk[2] << 8) >>> 0) + lastChunk[3];

        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, remaining + 1);
    }

    return '@U' + encoded;
}





export function regenerateSerial(parsed: any, originalBinary: string): string {
    let binary = originalBinary;

    if (parsed.level && parsed.level.position !== undefined) {
        const LEVEL_MARKER = '000000';
        const newLevel = parseInt(parsed.level.value, 10);
        const levelValueToEncode = newLevel;
        
        const level_bits = levelValueToEncode.toString(2).padStart(8, '0');
        
        if (binary.substring(parsed.level.position, parsed.level.position + 6) === LEVEL_MARKER) {
            const level_part = LEVEL_MARKER + level_bits;
            binary = binary.slice(0, parsed.level.position) + level_part + binary.slice(parsed.level.position + level_part.length);
        } else {
            binary = binary.slice(0, parsed.level.position) + level_bits + binary.slice(parsed.level.position + level_bits.length);
        }
    }

    if (parsed.manufacturer && parsed.manufacturer.position !== undefined) {
        const manufacturerPattern = parseInt(parsed.manufacturer.pattern, 16).toString(2).padStart(16, '0');
        binary = binary.slice(0, parsed.manufacturer.position) + manufacturerPattern + binary.slice(parsed.manufacturer.position + 16);
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
