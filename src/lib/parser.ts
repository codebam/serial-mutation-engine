import { Bitstream } from './bitstream';
import { AssetToken } from './types';
import {
    detectItemLevel_byte,
    MANUFACTURER_PATTERNS_BITS,
    ELEMENT_FLAG_BITS,
    ELEMENTAL_PATTERNS_V2_BITS,
    END_OF_ASSETS_MARKER_BITS,
    findBitPattern
} from './utils';

const MARKER_BITS = '00100010'.split('').map(c => parseInt(c, 2));

function readVarInt(stream: Bitstream): AssetToken {
    let result = 0n;
    let shift = 0n;
    let bytesRead = 0;
    const start_pos = stream.bit_pos;
    while (true) {
        const chunk_val = stream.read(6);
        if (chunk_val === null) {
            throw new Error("Not enough bits to read VarInt");
        }
        bytesRead++;
        const chunk = BigInt(chunk_val);
        const data = chunk & 0b011111n;
        result |= data << shift;
        shift += 5n;
        if ((chunk & 0b100000n) === 0n) {
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

export function parse(bytes: number[]): any {
    const stream = new Bitstream(bytes);
    stream.read(10);

    const bits = bytesToBits(bytes);

    const parsed: any = {
        assets: [],
    };

    const markerIndex = findBitPattern(bytes, MARKER_BITS, 10);

    let assets_start_pos;
    if (markerIndex !== -1 && markerIndex < 106) {
        const headerSizeStream = new Bitstream(bytes);
        headerSizeStream.bit_pos = markerIndex + MARKER_BITS.length;
        const headerSizeInBits = headerSizeStream.read(8);
        if (headerSizeInBits === null) throw new Error("Could not read header size");
        assets_start_pos = markerIndex + MARKER_BITS.length + 8 + headerSizeInBits;
    } else {
        assets_start_pos = 92;
    }

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
            const chunk = readVarInt(stream);
            const end_pos = stream.bit_pos;
            chunk.bits = bits.slice(start_pos, end_pos);
            parsed.assets.push(chunk);
        } catch (e) {
            break;
        }
    }
    parsed.preamble_bits = bits.slice(0, assets_start_pos);
    const trailer_start = endOfAssetsMarkerIndex !== -1 ? endOfAssetsMarkerIndex + END_OF_ASSETS_MARKER_BITS.length : stream.bit_pos;
    parsed.trailer_bits = bits.slice(trailer_start);
    
    const [level, level_pos] = detectItemLevel_byte(bytes);
    if (level !== 'Unknown') {
        parsed.level = {
            value: level,
            position: level_pos
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
        parsed.manufacturer = {
            name: bestMatch.name,
            pattern: bestMatch.pattern,
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
                    pattern: elementPattern.join(''),
                    position: elementFlagIndex
                };
            }
        }
    }

    return parsed;
}
