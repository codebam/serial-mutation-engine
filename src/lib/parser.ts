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

function parse_chunk(stream: Bitstream): { success: boolean; chunk: Chunk | null } {
    const initialPos = stream.pos;

    const len_code_bits = stream.read(4);
    if (len_code_bits === null) {
        return { success: false, chunk: null }; // End of stream
    }
    const len_code = parseInt(len_code_bits, 2);

    let len = 0;
    if (len_code === 2 || len_code === 4) len = 36;
    else if (len_code === 5) len = 12;
    else if (len_code === 10) len = 20;
    else if (len_code === 11) len = 14;
    else {
        stream.pos = initialPos;
        return { success: false, chunk: null };
    }

    if (stream.pos + (len - 4) > stream.binary.length) {
        stream.pos = initialPos;
        return { success: false, chunk: null }; // Not enough bits for chunk data
    }

    const chunk_data = readData(stream, len - 4);
    return { success: true, chunk: { chunk_type: 'standard', len_code: len_code, chunk_data } };
}

export function parse(binary: string): any {
    const stream = new Bitstream(binary);

    const type = readData(stream, 10);
    const header = readData(stream, 78);
    const prefix = readData(stream, 4);
    
    const chunks: Chunk[] = [];
    const parsed: any = {
        type: type,
        header: header,
        prefix: prefix,
        chunks: chunks
    };

    let remainingBinary = stream.binary.substring(stream.pos);

    // Find and parse the v2_element first
    const elementIndex = remainingBinary.indexOf(ELEMENT_FLAG);
    if (elementIndex !== -1) {
        const elementPattern = remainingBinary.substring(elementIndex + ELEMENT_FLAG.length, elementIndex + ELEMENT_FLAG.length + 8);
        const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2).find(([, p]) => p === elementPattern);
        if (foundElement) {
            parsed.v2_element = {
                element: foundElement[0],
                pattern: elementPattern,
                position: elementIndex
            };
            // Reconstruct the remaining binary without the element part
            remainingBinary = remainingBinary.substring(0, elementIndex) + remainingBinary.substring(elementIndex + ELEMENT_FLAG.length + 8);
        }
    }

    const chunkStream = new Bitstream(remainingBinary);
    while(chunkStream.pos < remainingBinary.length) {
        const result = parse_chunk(chunkStream);
        if (result.success && result.chunk) {
            chunks.push(result.chunk);
        } else {
            break;
        }
    }

    const rawBits = remainingBinary.substring(chunkStream.pos);
    if (rawBits.length > 0) {
        chunks.push({ chunk_type: 'raw', chunk_data: { bits: rawBits } });
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