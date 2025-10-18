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

function readVarInt(stream: Bitstream): number {
    let result = 0;
    let shift = 0;
    while (true) {
        const byte_str = stream.read(5);
        if (byte_str === null) {
            throw new Error("Not enough bits to read VarInt");
        }
        const byte = parseInt(byte_str, 2);
        const data = byte & 0b01111;
        result |= data << shift;
        shift += 4;
        if ((byte & 0b10000) === 0) {
            return result;
        }
    }
}

export function parse(binary: string): any {
    const stream = new Bitstream(binary);

    const type_bits = stream.read(10);
    let serial_type = 'Unknown';
    if (type_bits === '0010000100') {
        serial_type = 'TYPE A';
    } else if (type_bits === '0010000110') {
        serial_type = 'TYPE B';
    }


    let header: { bits: string } | null = null;
    let prefix: { bits: string } | null = null;

    if (serial_type === 'TYPE A') {
        const first12Bytes = binary.substring(10, 106);
        const markerIndex = first12Bytes.indexOf('00100010');

        if (markerIndex !== -1) {
            const headerSizeInBits = parseInt(binary.substring(10 + markerIndex + 8, 10 + markerIndex + 16), 2) * 8;
            stream.pos = 10 + markerIndex + 16;
            header = readData(stream, headerSizeInBits);
        } else {
            header = readData(stream, 78);
            prefix = readData(stream, 4);
        }
    } else {
        header = readData(stream, 78);
        prefix = readData(stream, 4);
    }
    
    const assets: number[] = [];
    const parsed: any = {
        type: { bits: type_bits },
        header: header,
        prefix: prefix,
        assets: assets
    };

    if (serial_type === 'TYPE A') {
        while (stream.pos < stream.binary.length) {
            try {
                const assetId = readVarInt(stream);
                assets.push(assetId);
            } catch (e) {
                console.error(e);
                break;
            }
        }
    }

    // Detect level
    const [level, level_pos] = detectItemLevel(binary);
    if (level !== 'Unknown') {
        parsed.level = {
            value: level,
            position: level_pos
        };
    }

    // Detect manufacturer
    for (const [manufacturer, patterns] of Object.entries(MANUFACTURER_PATTERNS)) {
        for (const pattern of patterns) {
            const pattern_binary = parseInt(pattern, 16).toString(2).padStart(16, '0');
            const manufacturerIndex = binary.indexOf(pattern_binary);
            if (manufacturerIndex !== -1) {
                parsed.manufacturer = {
                    name: manufacturer,
                    pattern: pattern,
                    position: manufacturerIndex
                };
                break;
            }
        }
        if (parsed.manufacturer) {
            break;
        }
    }

    return parsed;
}