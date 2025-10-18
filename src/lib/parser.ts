import { ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2, detectItemLevel, MANUFACTURER_PATTERNS } from './utils';

export interface Chunk {
    chunk_type: string;
    len_code?: number;
    chunk_data: {
        bits: string;
    } | null;
}

export class Bitstream {
    binary: string;
    pos: number;

    constructor(binaryString: string) {
        this.binary = binaryString;
        this.pos = 0;
    }

    read(length: number): string | null {
        if (this.pos + length > this.binary.length) return null;
        const bits = this.binary.substring(this.pos, this.pos + length);
        this.pos += length;
        return bits;
    }
}

function readData(stream: Bitstream, length: number): { bits: string } | null {
    const bits = stream.read(length);
    if (bits === null) return null;
    return { bits: bits };
}

function readVarInt(stream: Bitstream): bigint {
    let result = 0n;
    let shift = 0n;
    while (true) {
        const byte_str = stream.read(8);
        if (byte_str === null) {
            throw new Error("Not enough bits to read VarInt");
        }
        const byte = BigInt(parseInt(byte_str, 2));
        const data = byte & 0b01111111n;
        result |= data << shift;
        shift += 7n;
        if ((byte & 0b10000000n) === 0n) {
            return result;
        }
    }
}

export function parse(binary: string): any {
    const stream = new Bitstream(binary);

    const type_bits = stream.read(10);

    let preamble: string = '';
    const assets: bigint[] = [];
    let trailer: string = '';

    const first12Bytes = binary.substring(10, 106);
    const markerIndex = first12Bytes.indexOf('00100010');

            if (markerIndex !== -1) {
                const headerSizeInBits = parseInt(binary.substring(10 + markerIndex + 8, 10 + markerIndex + 16), 2);
                preamble = binary.substring(0, 10 + markerIndex + 16 + headerSizeInBits);
                stream.pos = 10 + markerIndex + 16 + headerSizeInBits;    } else {
        preamble = binary.substring(0, 92);
        stream.pos = 92;
    }

    while (stream.binary.length - stream.pos >= 6) {
        const chunk = stream.read(6);
        if (chunk) {
            assets.push(chunk);
        }
    }
    trailer = stream.binary.substring(stream.pos);
    
    const parsed: any = {
        preamble: preamble,
        assets: assets,
        trailer: trailer
    };

    // Detect level
    const [level, level_pos] = detectItemLevel(binary);
    if (level !== 'Unknown') {
        parsed.level = {
            value: level,
            position: level_pos
        };
    }

    // Detect manufacturer
    const allOccurrences = [];
    for (const [manufacturer, patterns] of Object.entries(MANUFACTURER_PATTERNS)) {
        for (const pattern of patterns) {
            const pattern_binary = parseInt(pattern, 16).toString(2).padStart(16, '0');
            let fromIndex = 0;
            while (true) {
                const index = binary.indexOf(pattern_binary, fromIndex);
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

    return parsed;
}