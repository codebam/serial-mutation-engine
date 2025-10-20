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
        let bitsInByte = 0;
        for (let j = 0; j < 8; j++) {
            if (i + j < bitsLength) {
                byte = (byte << 1) | bits[i + j];
                bitsInByte++;
            }
        }
        if (bitsInByte > 0 && bitsInByte < 8) {
            byte <<= (8 - bitsInByte);
        }
        bytes.push(byte);
    }
    return bytes;
}

export function parsedToSerial(parsed: any): string {
    const assetsToEncode = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
    const asset_parts: { position: number, bits: number[], bitLength: number }[] = [];
    if (assetsToEncode) {
        for (const asset of assetsToEncode) {
            const current_asset = {...asset};
            if (!current_asset.bits && current_asset.value !== undefined) {
                current_asset.bitLength = current_asset.bitLength || 6;
                const val_str = current_asset.value.toString(2).padStart(current_asset.bitLength, '0');
                current_asset.bits = val_str.split('').map(Number);
            }
            asset_parts.push(current_asset);
        }
    }

    const metadata_parts: { position: number, bits: number[], bitLength: number }[] = [];
    if (parsed.manufacturer && parsed.manufacturer.position !== undefined) {
        const part = { position: parsed.manufacturer.position, bits: parsed.manufacturer.pattern, bitLength: parsed.manufacturer.pattern.length };
        metadata_parts.push(part);
    }

    if (parsed.element && parsed.element.position !== undefined) {
        const elementPart = [...ELEMENT_FLAG_BITS, ...parsed.element.pattern];
        const part = { position: parsed.element.position, bits: elementPart, bitLength: elementPart.length };
        metadata_parts.push(part);
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
            } else if (newLevel === 50) {
                levelValueToEncode = 98;
            } else {
                levelValueToEncode = newLevel;
            }
            level_bits_to_encode = levelValueToEncode.toString(2).padStart(8, '0').split('').map(Number);
        }

        if (parsed.level.method === 'standard') {
            const LEVEL_MARKER_BITS = [0, 0, 0, 0, 0, 0];
            const level_part = [...LEVEL_MARKER_BITS, ...level_bits_to_encode];
            metadata_parts.push({ position: parsed.level.position, bits: level_part, bitLength: level_part.length });
        } else {
            metadata_parts.push({ position: parsed.level.position, bits: level_bits_to_encode, bitLength: level_bits_to_encode.length });
        }
    }

    const filtered_asset_parts = asset_parts.filter(asset => {
        for (const meta of metadata_parts) {
            const asset_start = asset.position;
            const asset_end = asset.position + asset.bitLength;
            const meta_start = meta.position;
            const meta_end = meta.position + meta.bitLength;
            if (asset_start < meta_end && asset_end > meta_start) {
                return false; // Overlap, filter out this asset
            }
        }
        return true;
    });

    const parts = [...filtered_asset_parts, ...metadata_parts];
    parts.sort((a, b) => a.position - b.position);

    let assets_bits = parsed.original_bits.slice(parsed.assets_start_pos, parsed.trailer_start);

    // Create a map for faster lookups of original asset bitLengths
    const original_asset_lengths = new Map();
    const original_assets = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
    for (const asset of original_assets) {
        original_asset_lengths.set(asset.position, asset.bitLength);
    }

    // Iterate backwards to avoid index shifting issues with splice
    for (const part of [...parts].reverse()) {
        if (part.position === undefined) continue;

        const relative_pos = part.position - parsed.assets_start_pos;
        if (relative_pos < 0) continue;

        if (!part.bits) continue;

        const original_length = original_asset_lengths.get(part.position) || part.bitLength;
        
        assets_bits.splice(relative_pos, original_length, ...part.bits);
    }

    const all_bits = [...parsed.preamble_bits, ...assets_bits, ...parsed.trailer_bits];

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
