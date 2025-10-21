import { Bitstream } from './bitstream';
import type { Serial, Block, Part } from './types';
import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from './types';

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

    if (i < bytes.length) {
        const remaining = bytes.length - i;
        let value = 0;

        if (remaining >= 1) {
            value |= bytes[i] << 24;
        }
        if (remaining >= 2) {
            value |= bytes[i + 1] << 16;
        }
        if (remaining >= 3) {
            value |= bytes[i + 2] << 8;
        }

        // Shift to appropriate position
        if (remaining === 3) {
            value <<= 8;
        } else if (remaining === 2) {
            value <<= 16;
        } else if (remaining === 1) {
            value <<= 24;
        }

        value >>>= 0; // Ensure unsigned 32-bit

        let block = '';
        block += BASE85_ALPHABET[Math.floor(value / _85_4)];
        value %= _85_4;
        block += BASE85_ALPHABET[Math.floor(value / _85_3)];
        value %= _85_3;

        if (remaining >= 2) {
            block += BASE85_ALPHABET[Math.floor(value / _85_2)];
            value %= _85_2;

            if (remaining === 3) {
                block += BASE85_ALPHABET[Math.floor(value / _85_1)];
            }
        }
        encoded += block;
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

function bestTypeForValue(v: number): { token: number[], bits: number[] } {
    const streamVarint = new Bitstream(new Uint8Array(10));
    writeVarint(streamVarint, v);

    const streamVarbit = new Bitstream(new Uint8Array(10));
    writeVarbit(streamVarbit, v);

    if (streamVarint.bit_pos > streamVarbit.bit_pos) {
        const bits = [];
        for(let i = 0; i < streamVarbit.bit_pos; i++) {
            bits.push((streamVarbit.bytes[Math.floor(i/8)] >> (7 - (i%8))) & 1);
        }
        return { token: [1, 1, 0], bits };
    } else {
        const bits = [];
        for(let i = 0; i < streamVarint.bit_pos; i++) {
            bits.push((streamVarint.bytes[Math.floor(i/8)] >> (7 - (i%8))) & 1);
        }
        return { token: [1, 0, 0], bits };
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
                const { token, bits } = bestTypeForValue(v);
                stream.writeBits(token);
                stream.writeBits(bits);
            }
            stream.writeBits([0, 0]); // TOK_SEP1
            break;
    }
}

const TOK_SEP1 = [0, 0];
const TOK_SEP2 = [0, 1];
const TOK_VARINT = [1, 0, 0];
const TOK_VARBIT = [1, 1, 0];
const TOK_PART = [1, 0, 1];
const TOK_UNSUPPORTED_111 = [1, 1, 1];

export function encodeSerial(serial: Serial): string {
    const stream = new Bitstream(new Uint8Array(250));
    console.log(`Encode: Initial bit_pos: ${stream.bit_pos}`);

    // Magic header
    stream.write(0b0010000, 7);
    console.log(`Encode: After magic header. bit_pos: ${stream.bit_pos}`);

    for (const block of serial) {
        console.log(`Encode: Processing block: ${JSON.stringify(block)}. bit_pos: ${stream.bit_pos}`);
        switch (block.token) {
            case 0: // TOK_SEP1
                stream.writeBits(TOK_SEP1);
                console.log(`Encode: Wrote TOK_SEP1. bit_pos: ${stream.bit_pos}`);
                break;
            case 1: // TOK_SEP2
                stream.writeBits(TOK_SEP2);
                console.log(`Encode: Wrote TOK_SEP2. bit_pos: ${stream.bit_pos}`);
                break;
            case 2: // TOK_VARINT
                stream.writeBits(TOK_VARINT);
                console.log(`Encode: Wrote TOK_VARINT bits. bit_pos: ${stream.bit_pos}`);
                writeVarint(stream, block.value!);
                console.log(`Encode: Wrote VARINT value. bit_pos: ${stream.bit_pos}`);
                break;
            case 3: // TOK_VARBIT
                stream.writeBits(TOK_VARBIT);
                console.log(`Encode: Wrote TOK_VARBIT bits. bit_pos: ${stream.bit_pos}`);
                writeVarbit(stream, block.value!);
                console.log(`Encode: Wrote VARBIT value. bit_pos: ${stream.bit_pos}`);
                break;
            case 4: // TOK_PART
                stream.writeBits(TOK_PART);
                console.log(`Encode: Wrote TOK_PART bits. bit_pos: ${stream.bit_pos}`);
                writePart(stream, block.part!);
                console.log(`Encode: Wrote PART. bit_pos: ${stream.bit_pos}`);
                break;
        }
    }

    console.log(`Encode: Final bit_pos before slicing: ${stream.bit_pos}`);
    const bytes = stream.bytes.slice(0, Math.ceil(stream.bit_pos / 8));
    console.log(`Encode: Sliced bytes length: ${bytes.length}`);
    const mirrored = mirrorBytes(bytes);
    return '@U' + encodeBase85(mirrored);
}