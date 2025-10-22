import { Bitstream } from './bitstream.js';
import type { Serial, Block, Part } from './types.js';
import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE, TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART } from './types.js';

const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

// Powers of 85
const _85_1 = 85;
const _85_2 = 85 * 85;
const _85_3 = 85 * 85 * 85;
const _85_4 = 85 * 85 * 85 * 85;

function encodeBase85(bytes: Uint8Array): string {
    let encoded = '';
    let i = 0;

    for (i = 0; i + 3 < bytes.length; i += 4) {
        let value = (((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0);
        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block;
    }

    const remaining = bytes.length - i;
    if (remaining > 0) {
        const temp = new Uint8Array(4);
        for (let j = 0; j < remaining; j++) {
            temp[j] = bytes[i + j];
        }

        let value = (((temp[0] << 24) | (temp[1] << 16) | (temp[2] << 8) | temp[3]) >>> 0);
        let block = '';
        for (let j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, remaining + 1);
    }

    return '@U' + encoded;
}

function mirrorBytes(bytes: Uint8Array): Uint8Array {
    const mirrored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        let byte = bytes[i];
        let mirroredByte = 0;
        for (let j = 0; j < 8; j++) {
            mirroredByte |= ((byte >> j) & 1) << (7 - j);
        }
        mirrored[i] = mirroredByte;
    }
    return mirrored;
}

function IntBitsSize(v: number, minSize: number, maxSize: number): number {
    let nBits = 0;
    while (v > 0) {
        nBits++;
        v >>= 1;
    }

    if (nBits < minSize) {
        nBits = minSize;
    }

    if (nBits > maxSize) {
        nBits = maxSize;
    }

    return nBits;
}

export function writeVarint(stream: Bitstream, value: number) {
    const VARINT_BITS_PER_BLOCK = 4;
    const VARINT_MAX_USABLE_BITS = 16;

    let nBits = IntBitsSize(value, 0, VARINT_MAX_USABLE_BITS);
    if (nBits === 0) {
        nBits = 1;
    }

    // Write complete blocks
    while (nBits > VARINT_BITS_PER_BLOCK) {
        for (let i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
            stream.writeBit(value & 1);
            value >>= 1;
        }
        stream.writeBit(1); // Continuation bit
        nBits -= VARINT_BITS_PER_BLOCK;
    }

    // Write partial last block
    if (nBits > 0) {
        for (let i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
            if (nBits > 0) {
                stream.writeBit(value & 1);
                value >>= 1;
                nBits--;
            } else {
                stream.writeBit(0); // Padding
            }
        }
        stream.writeBit(0); // No continuation
    }
}

export function writeVarbit(stream: Bitstream, value: number) {
    const VARBIT_LENGTH_BLOCK_SIZE = 5;
    const nBits = IntBitsSize(value, 0, (1 << VARBIT_LENGTH_BLOCK_SIZE) - 1);

    // Write length
    let lengthBits = nBits;
    for (let i = 0; i < VARBIT_LENGTH_BLOCK_SIZE; i++) {
        stream.writeBit(lengthBits & 1);
        lengthBits >>= 1;
    }

    // Write value bits
    let valueBits = value;
    for (let i = 0; i < nBits; i++) {
        stream.writeBit(valueBits & 1);
        valueBits >>= 1;
    }
}





function writePart(stream: Bitstream, part: Part) {
    writeVarint(stream, part.index);

    switch (part.subType) {
        case SUBTYPE_NONE:
            stream.writeBits([0, 1, 0]);
            break;
        case SUBTYPE_INT:
            stream.writeBit(1);
            writeVarint(stream, part.value!);
            stream.writeBits([0, 0, 0]);
            break;
        case SUBTYPE_LIST:
            stream.writeBits([0, 0, 1]);
            stream.writeBits([0, 1]); // TOK_SEP2
            for (const v of part.values!) {
                if (v.type === TOK_VARINT) {
                    stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
                    writeVarint(stream, v.value);
                } else {
                    stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
                    writeVarbit(stream, v.value);
                }
            }
            stream.writeBits([0, 0]); // TOK_SEP1
            break;
    }
}


const TOKEN_BIT_PATTERNS = {
    [TOK_SEP1]: [0, 0],
    [TOK_SEP2]: [0, 1],
    [TOK_VARINT]: [1, 0, 0],
    [TOK_VARBIT]: [1, 1, 0],
    [TOK_PART]: [1, 0, 1]
};

export function encodeSerial(serial: Serial): string {
    const stream = new Bitstream(new Uint8Array(250));

    // Magic header
    stream.write(0b0010000, 7);

    for (const block of serial) {
        switch (block.token) {
            case TOK_SEP1:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP1]);
                break;
            case TOK_SEP2:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP2]);
                break;
            case TOK_VARINT:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
                writeVarint(stream, block.value!);
                break;
            case TOK_VARBIT:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
                writeVarbit(stream, block.value!);
                break;
            case TOK_PART:
                if (!block.part) {
                    throw new Error('TOK_PART block is missing a part property');
                }
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_PART]);
                writePart(stream, block.part!);
                break;
        }
    }

    const bytes = stream.bytes.slice(0, Math.ceil(stream.bit_pos / 8));
    const mirrored = mirrorBytes(bytes);
    return encodeBase85(mirrored);
}