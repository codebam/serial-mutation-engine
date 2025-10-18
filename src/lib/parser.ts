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

    let len = 0;
    if (len_code === 5) len = 12;
    else if (len_code === 10) len = 20;
    else if (len_code === 11) len = 14;
    else {
        stream.pos = initialPos;
        return { success: false, chunk: null }; // Invalid len_code
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
    
    const chunks = [];
    const parsed: any = {
        type: type,
        header: header,
        prefix: prefix,
        chunks: chunks
    };

    const remainingBinary = stream.binary.substring(stream.pos);
    const chunkStream = new Bitstream(remainingBinary);
    let lastPos = 0;
    while(chunkStream.pos < remainingBinary.length) {
        const initialPos = chunkStream.pos;

        // Check for element first
        if (remainingBinary.substring(initialPos, initialPos + ELEMENT_FLAG.length) === ELEMENT_FLAG) {
            if (initialPos > lastPos) {
                const rawBits = remainingBinary.substring(lastPos, initialPos);
                chunks.push({ chunk_type: 'raw', chunk_data: { bits: rawBits } });
            }
            chunkStream.pos += ELEMENT_FLAG.length;
            const elementPattern = chunkStream.read(8);
            if (elementPattern) {
                const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2).find(([, p]) => p === elementPattern);
                if (foundElement) {
                    chunks.push({
                        chunk_type: 'v2_element',
                        element: foundElement[0],
                        pattern: elementPattern
                    });
                }
            }
            lastPos = chunkStream.pos;
            continue;
        }

        const result = parse_chunk(chunkStream);
        if (result.success) {
            if (initialPos > lastPos) {
                const rawBits = remainingBinary.substring(lastPos, initialPos);
                chunks.push({ chunk_type: 'raw', chunk_data: { bits: rawBits } });
            }
            chunks.push(result.chunk);
            lastPos = chunkStream.pos;
        } else {
            chunkStream.pos = initialPos + 1;
        }
    }
    if (lastPos < remainingBinary.length) {
        const rawBits = remainingBinary.substring(lastPos);
        chunks.push({ chunk_type: 'raw', chunk_data: { bits: rawBits } });
    }


    return parsed;
}