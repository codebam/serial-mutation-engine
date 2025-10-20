import type { AssetToken } from './types';
import { ELEMENT_FLAG_BITS, END_OF_ASSETS_MARKER_BITS } from './utils';

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

function bitsToBytes(bits: number[]): number[] {
    const bytes: number[] = [];
    const bitsLength = bits.length;
    for (let i = 0; i < bitsLength; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
            if (i + j < bitsLength) {
                byte = (byte << 1) | bits[i + j];
            }
        }
        bytes.push(byte);
    }
    return bytes;
}

function writeVarInt_bits(value: bigint): number[] {
    if (value === 0n) {
        return [0, 0, 0, 0, 0, 0];
    }
    const bits: number[] = [];
    while (value > 0n) {
        let part = Number(value & 0b011111n);
        value >>= 5n;
        if (value > 0n) {
            part |= 0b100000;
        }
        bits.push(...part.toString(2).padStart(6, '0').split('').map(Number));
    }
    return bits;
}

function encodeAssets(parsed: any): number[] {
    let bits: number[] = [];
    if (parsed.assets) {
        for (const asset of parsed.assets) {
            if (asset.bits) {
                bits.push(...asset.bits);
            } else {
                // Fallback for assets that don't have bits stored (e.g. newly created assets)
                if (parsed.isVarInt) {
                    bits.push(...writeVarInt_bits(asset.value));
                } else {
                    const assetBits = [];
                    let num = Number(asset.value);
                    for(let i=5; i>=0; i--) {
                        assetBits.push((num >> i) & 1);
                    }
                    bits.push(...assetBits);
                }
            }
        }
    }
    return bits;
}

export function parsedToSerial(parsed: any): string {
    const assets_bits = encodeAssets(parsed);

    let all_bits;
    if (parsed.isVarInt) {
        all_bits = [...parsed.preamble_bits, ...assets_bits, ...END_OF_ASSETS_MARKER_BITS, ...parsed.trailer_bits];
    } else {
        all_bits = [...parsed.preamble_bits, ...assets_bits, ...parsed.trailer_bits];
    }

    if (parsed.manufacturer && parsed.manufacturer.position !== undefined) {
        const manufacturerPattern = parsed.manufacturer.pattern;
        all_bits.splice(parsed.manufacturer.position, manufacturerPattern.length, ...manufacturerPattern);
    }

    if (parsed.element && parsed.element.position !== undefined) {
        const elementPattern = parsed.element.pattern;
        const elementPart = [...ELEMENT_FLAG_BITS, ...elementPattern];
        all_bits.splice(parsed.element.position, elementPart.length, ...elementPart);
    }

    if (parsed.level && parsed.level.position !== undefined) {
        let level_bits_to_encode;
        if (parsed.level.bits) {
            level_bits_to_encode = parsed.level.bits;
        } else {
            const newLevel = parseInt(parsed.level.value, 10);
            let levelValueToEncode;

            if (newLevel === 1) {
                levelValueToEncode = 49;
            } else if (newLevel === 2) {
                levelValueToEncode = 2;
            } else if (newLevel >= 3 && newLevel <= 49) {
                levelValueToEncode = newLevel + 48;
            } else {
                levelValueToEncode = newLevel;
            }
            level_bits_to_encode = levelValueToEncode.toString(2).padStart(8, '0').split('').map(Number);
        }

        if (parsed.level.method === 'standard') {
            const LEVEL_MARKER_BITS = [0, 0, 0, 0, 0, 0];
            const level_part = [...LEVEL_MARKER_BITS, ...level_bits_to_encode];
            all_bits.splice(parsed.level.position, level_part.length, ...level_part);
        } else {
            all_bits.splice(parsed.level.position, level_bits_to_encode.length, ...level_bits_to_encode);
        }
    }

    const bytes = bitsToBytes(all_bits);

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
