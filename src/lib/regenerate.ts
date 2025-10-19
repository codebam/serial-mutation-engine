import { MANUFACTURER_PATTERNS, ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2 } from './utils';
import * as fs from 'fs';
import { parse } from './parser';
import { serialToBinary } from './decode';

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
    const originalParsed = parse(originalBinary);
    const assetsStartPosition = originalParsed.preamble.length;
    const oldAssetsLength = originalParsed.assets.length * 6;
    const newAssetsString = parsed.assets.join('');
    
    let binary = originalBinary.slice(0, assetsStartPosition) + newAssetsString + originalBinary.slice(assetsStartPosition + oldAssetsLength);

    const lengthDifference = newAssetsString.length - oldAssetsLength;

    if (parsed.level && parsed.level.position !== undefined) {
        let pos = originalParsed.level.position;
        if (pos > assetsStartPosition) {
            pos += lengthDifference;
        }
        const LEVEL_MARKER = '000000';
        const newLevel = parseInt(parsed.level.value, 10);
        let levelValueToEncode;

        if (newLevel === 1) {
            levelValueToEncode = 49;
        } else if (newLevel === 50) {
            levelValueToEncode = 50;
        } else if (newLevel > 1 && newLevel < 50) {
            levelValueToEncode = newLevel + 48;
        } else {
            levelValueToEncode = newLevel;
        }
        
        const level_bits = levelValueToEncode.toString(2).padStart(8, '0');
        
        if (binary.substring(pos, pos + 6) === LEVEL_MARKER) {
            const level_part = LEVEL_MARKER + level_bits;
            binary = binary.slice(0, pos) + level_part + binary.slice(pos + level_part.length);
        } else {
            binary = binary.slice(0, pos) + level_bits + binary.slice(pos + 8);
        }
    }

    if (parsed.manufacturer && parsed.manufacturer.position !== undefined) {
        let pos = originalParsed.manufacturer.position;
        if (pos > assetsStartPosition) {
            pos += lengthDifference;
        }
        const manufacturerPattern = parseInt(parsed.manufacturer.pattern, 16).toString(2).padStart(16, '0');
        binary = binary.slice(0, pos) + manufacturerPattern + binary.slice(pos + 16);
    }

    if (parsed.element && parsed.element.position !== undefined) {
        let pos = originalParsed.element.position;
        if (pos > assetsStartPosition) {
            pos += lengthDifference;
        }
        const elementPart = ELEMENT_FLAG + parsed.element.pattern;
        binary = binary.slice(0, pos) + elementPart + binary.slice(pos + elementPart.length);
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