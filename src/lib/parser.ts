import { Bitstream } from './bitstream';
import type { AssetToken } from './types';
import {
    detectItemLevel_byte,
    MANUFACTURER_PATTERNS_BITS,
    ELEMENT_FLAG_BITS,
    ELEMENTAL_PATTERNS_V2_BITS,
    END_OF_ASSETS_MARKER_BITS,
    findBitPattern
} from './utils';
import { parsedToSerial } from './encoder';
import { serialToBytes } from './decode';

function readVarInt(stream: Bitstream, bitSize: number): { value: bigint, bitLength: number } {
    let result = 0n;
    let shift = 0n;
    let bytesRead = 0;
    const start_pos = stream.bit_pos;
    while (true) {
        const chunk_val = stream.read(bitSize);
        if (chunk_val === null) {
            throw new Error("Not enough bits to read VarInt");
        }
        bytesRead++;
        const chunk = BigInt(chunk_val);
        const data = chunk & ((1n << (BigInt(bitSize) - 1n)) - 1n);
        result |= data << shift;
        shift += BigInt(bitSize) - 1n;
        if ((chunk & (1n << (BigInt(bitSize) - 1n))) === 0n) {
            return { value: result, bitLength: stream.bit_pos - start_pos };
        }
        if (bytesRead > 12) { 
            throw new Error("Varint is too long");
        }
    }
}

function bytesToBits(bytes: number[]): number[] {
    const bits: number[] = [];
    for (const byte of bytes) {
        bits.push(...byte.toString(2).padStart(8, '0').split('').map(Number));
    }
    return bits;
}

function parseMetadata(bytes: number[], parsed: any, bits: number[]) {
    const [level, level_pos, level_bits, level_method] = detectItemLevel_byte(bytes);
    if (level !== 'Unknown') {
        parsed.level = {
            value: level,
            position: level_pos,
            bits: level_bits,
            method: level_method
        };
    }

    const allOccurrences = [];
    for (const [manufacturer, patterns] of Object.entries(MANUFACTURER_PATTERNS_BITS)) {
        for (const pattern of patterns) {
            let fromIndex = 0;
            while (true) {
                const index = findBitPattern(bytes, pattern, fromIndex);
                if (index === -1) {
                    break;
                }
                const score = 100 - Math.floor(index / 10);
                allOccurrences.push({ name: manufacturer, pattern: pattern, position: index, score: score });
                fromIndex = index + 1;
            }
        }
    }

    if (allOccurrences.length > 0) {
        const bestMatch = allOccurrences.reduce((best, current) => (current.score > best.score ? current : best));
        const actualPattern = bits.slice(bestMatch.position, bestMatch.position + bestMatch.pattern.length);
        parsed.manufacturer = {
            name: bestMatch.name,
            pattern: actualPattern,
            position: bestMatch.position
        };
    }

    const elementFlagIndex = findBitPattern(bytes, ELEMENT_FLAG_BITS);
    if (elementFlagIndex !== -1) {
        const elementStream = new Bitstream(bytes);
        elementStream.bit_pos = elementFlagIndex + ELEMENT_FLAG_BITS.length;
        const elementPatternBits = elementStream.read(8);
        if (elementPatternBits !== null) {
            const elementPattern = elementPatternBits.toString(2).padStart(8, '0').split('').map(Number);
            const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2_BITS).find(([, p]) => 
                p.length === elementPattern.length && p.every((val, index) => val === elementPattern[index])
            );
            if (foundElement) {
                parsed.element = {
                    name: foundElement[0],
                    pattern: elementPattern,
                    position: elementFlagIndex
                };
            }
        }
    }
}

function parseAsVarInt(bytes: number[], bitSize: number): any {
    const stream = new Bitstream(bytes);
    stream.read(10);

    const bits = bytesToBits(bytes);

    const parsed: any = {
        assets: [],
    };

    parseMetadata(bytes, parsed, bits);

    const assets_start_pos = 13 * 8;

    const endOfAssetsMarkerIndex = findBitPattern(bytes, END_OF_ASSETS_MARKER_BITS, assets_start_pos);
    parsed.hasEndOfAssetsMarker = endOfAssetsMarkerIndex !== -1;

    stream.bit_pos = assets_start_pos;

    const assets_end_pos = endOfAssetsMarkerIndex !== -1 ? endOfAssetsMarkerIndex : bytes.length * 8;
    while (stream.bit_pos < assets_end_pos) {
        if (assets_end_pos - stream.bit_pos < 6) {
            break;
        }
        try {
            const start_pos = stream.bit_pos;
            const { value, bitLength } = readVarInt(stream, bitSize);
            const end_pos = stream.bit_pos;
            const asset_bits = bits.slice(start_pos, end_pos);
            const token: AssetToken = { value, bitLength, bits: asset_bits, position: start_pos };
            parsed.assets.push(token);
        } catch (e) {
            break;
        }
    }
    
    parsed.isVarInt = true;
    parsed.preamble_bits = bits.slice(0, assets_start_pos);
    const trailer_start = stream.bit_pos;
    parsed.trailer_bits = bits.slice(trailer_start);
    parsed.assets_start_pos = assets_start_pos;
    parsed.trailer_start = trailer_start;
    parsed.original_bits = bits;


    const tempStream = new Bitstream(bytes);
    tempStream.bit_pos = assets_start_pos;
    const assets_fixed = [];
    const totalBits = bytes.length * 8;
    while (totalBits - tempStream.bit_pos >= bitSize) {
        const chunk = tempStream.read(bitSize);
        if (chunk !== null) {
            const asset_bits = bits.slice(tempStream.bit_pos - bitSize, tempStream.bit_pos);
            const token: AssetToken = { value: BigInt(chunk), bitLength: bitSize, bits: asset_bits, position: tempStream.bit_pos - bitSize };
            assets_fixed.push(token);
        }
    }
    parsed.assets_fixed = assets_fixed;
    
    return parsed;
}

function parseAsFixedWidth(bytes: number[], bitSize: number): any {
    const stream = new Bitstream(bytes);
    stream.read(10);

    const bits = bytesToBits(bytes);

    const parsed: any = {
        assets: [],
        assets_fixed: [],
    };

    parseMetadata(bytes, parsed, bits);

    const assets_start_pos = 13 * 8;

    const endOfAssetsMarkerIndex = findBitPattern(bytes, END_OF_ASSETS_MARKER_BITS, assets_start_pos);
    parsed.hasEndOfAssetsMarker = endOfAssetsMarkerIndex !== -1;

    stream.bit_pos = assets_start_pos;

    const assets_end_pos = endOfAssetsMarkerIndex !== -1 ? endOfAssetsMarkerIndex : bytes.length * 8;
    while (stream.bit_pos < assets_end_pos) {
        if (assets_end_pos - stream.bit_pos < bitSize) {
            break;
        }
        const chunk = stream.read(bitSize);
        if (chunk !== null) {
            const asset_bits = bits.slice(stream.bit_pos - bitSize, stream.bit_pos);
            const token: AssetToken = { value: BigInt(chunk), bitLength: bitSize, bits: asset_bits, position: stream.bit_pos - bitSize };
            parsed.assets_fixed.push(token);
        }
    }
    
    parsed.isVarInt = false;
    parsed.preamble_bits = bits.slice(0, assets_start_pos);
    const trailer_start = stream.bit_pos;
    parsed.trailer_bits = bits.slice(trailer_start);
    parsed.assets_start_pos = assets_start_pos;
    parsed.trailer_start = trailer_start;
    parsed.original_bits = bits;

    const tempStream = new Bitstream(bytes);
    tempStream.bit_pos = assets_start_pos;
    const totalBits = bytes.length * 8;
    while (totalBits - tempStream.bit_pos >= bitSize) {
        try {
            const start_pos = tempStream.bit_pos;
            const { value, bitLength } = readVarInt(tempStream, bitSize);
            const end_pos = tempStream.bit_pos;
            const asset_bits = bits.slice(start_pos, end_pos);
            const token: AssetToken = { value, bitLength, bits: asset_bits, position: start_pos };
            parsed.assets.push(token);
        } catch (e) {
            break;
        }
    }

    return parsed;
}

export function parse(bytes: number[], parsingMode: string, bitSize: number): any {
    if (parsingMode === 'varint') {
        const parsedAsVarInt = parseAsVarInt(bytes, bitSize);
        const newSerialVarInt = parsedToSerial(parsedAsVarInt, undefined, bitSize);
        const newBytesVarInt = serialToBytes(newSerialVarInt);
        const isVarIntStable = bytes.length === newBytesVarInt.length && bytes.every((b, i) => b === newBytesVarInt[i]);

        if (isVarIntStable) {
            return parsedAsVarInt;
        }
    }

    const parsedAsFixed = parseAsFixedWidth(bytes, bitSize);
    const newSerialFixed = parsedToSerial(parsedAsFixed, undefined, bitSize);
    const newBytesFixed = serialToBytes(newSerialFixed);
    const isFixedStable = bytes.length === newBytesFixed.length && bytes.every((b, i) => b === newBytesFixed[i]);

    if (isFixedStable) {
        return parsedAsFixed;
    }

    // Fallback to varint if fixed is not stable
    if (parsingMode === 'fixed') {
        return parseAsVarInt(bytes, bitSize);
    }

    return parseAsFixedWidth(bytes, bitSize);
}
