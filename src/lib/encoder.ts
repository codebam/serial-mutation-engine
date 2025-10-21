import { Bitstream } from './bitstream';
import type { Serial, Block, Part } from './types';
import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE } from './types';

const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

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
        const lastChunk = new Uint8Array(4);
        lastChunk.set(bytes.slice(i));
        let value = (((lastChunk[0] << 24) | (lastChunk[1] << 16) | (lastChunk[2] << 8) | lastChunk[3]) >>> 0);

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

export function encodeSerial(serial: Serial): string {

    const stream = new Bitstream(new Uint8Array(250));



    // Magic header

    stream.write(0b0010000, 7);



    for (const block of serial) {

        switch (block.token) {

            case 0: // TOK_SEP1

                stream.writeBits(TOK_SEP1);

                break;

            case 1: // TOK_SEP2

                stream.writeBits(TOK_SEP2);

                break;

            case 4: // TOK_VARINT

                stream.writeBits(TOK_VARINT);

                writeVarint(stream, block.value!);

                break;

            case 6: // TOK_VARBIT

                stream.writeBits(TOK_VARBIT);

                writeVarbit(stream, block.value!);

                break;

            case 5: // TOK_PART

                stream.writeBits(TOK_PART);

                writePart(stream, block.part!);

                break;

        }

    }



    const bytes = stream.bytes.slice(0, Math.ceil(stream.bit_pos / 8));

    const mirrored = mirrorBytes(bytes);

    return encodeBase85(mirrored);

}