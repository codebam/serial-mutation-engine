import { ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2 } from './utils';

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

function parse_chunk(stream: Bitstream): { success: boolean; chunk: any | null } {
    const initialPos = stream.pos;

    const len_code_bits = stream.read(4);
    if (len_code_bits === null) {
        return { success: false, chunk: null }; // End of stream
    }
    const len_code = parseInt(len_code_bits, 2);

    let len = 36;

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
    
    const chunks = [];
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
        if (result.success) {
            chunks.push(result.chunk);
        } else {
            break;
        }
    }


    return parsed;
}