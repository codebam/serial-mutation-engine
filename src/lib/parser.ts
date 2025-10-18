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

function readHex(stream: Bitstream, length: number): { hex: string; bits: number } | null {
    const bits = stream.read(length);
    if (bits === null) return null;

    let paddedBits = bits;
    while (paddedBits.length % 4 !== 0) {
        paddedBits += '0';
    }

    let hex = '';
    for (let i = 0; i < paddedBits.length; i += 4) {
        hex += parseInt(paddedBits.substring(i, i + 4), 2).toString(16);
    }

    return { hex: hex, bits: length };
}

function parse_chunk(stream: Bitstream): any | null {
    const initialPos = stream.pos;

    const len_code_bits = stream.read(4);
    if (len_code_bits === null) {
        stream.pos = initialPos;
        return null;
    }
    const len_code = parseInt(len_code_bits, 2);

    let len = 0;
    if (len_code === 5) len = 12;
    else if (len_code === 10) len = 20;
    else if (len_code === 11) len = 14;
    else {
        stream.pos = initialPos;
        return null;
    }

    if (stream.pos + (len - 4) > stream.binary.length) {
        stream.pos = initialPos;
        return null;
    }

    const chunk_data = readHex(stream, len - 4);
    return { chunk_type: 'standard', len_code: len_code, chunk_data };
}

export function parse(binary: string): any {
    const stream = new Bitstream(binary);

    const type = readHex(stream, 10);
    const header = readHex(stream, 78);
    const prefix = readHex(stream, 4);
    
    const chunks = [];
    const parsed: any = {
        type: type,
        header: header,
        prefix: prefix,
        chunks: chunks
    };

    while(stream.pos < binary.length) {
        const chunk = parse_chunk(stream);
        if (chunk) {
            chunks.push(chunk);
            continue;
        }

        // Could not parse a standard chunk. Check for element.
        if (stream.binary.substring(stream.pos, stream.pos + ELEMENT_FLAG.length) === ELEMENT_FLAG) {
            stream.read(ELEMENT_FLAG.length);
            const elementPattern = stream.read(8);
            if (elementPattern) {
                const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2).find(([, p]) => p === elementPattern);
                if (foundElement) {
                    parsed.v2_element = {
                        element: foundElement[0],
                        pattern: elementPattern
                    };
                    continue; // Continue parsing
                }
            }
        }

        // If we are here, we could not parse a standard chunk or an element.
        break;
    }

    const remainingBits = stream.read(binary.length - stream.pos);
    if (remainingBits && remainingBits.length > 0) {
        let trailerChunkSize = 16; // Default size
        if (chunks.length > 0) {
            const totalBits = chunks.reduce((acc, c) => acc + c.chunk_data.bits + 4, 0);
            trailerChunkSize = Math.round(totalBits / chunks.length);
        }

        const trailerChunks: any[] = [];
        for (let i = 0; i < remainingBits.length; i += trailerChunkSize) {
            const chunk = remainingBits.substring(i, i + trailerChunkSize);
            trailerChunks.push({ chunk_type: 'raw', chunk_data: readHex({ read: (length: number) => chunk.substring(0, length) } as Bitstream, chunk.length) });
        }
        parsed.trailer_chunks = trailerChunks;
    }

    return parsed;
}