var _a;
import { Bitstream } from './bitstream.js';
import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE, TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART } from './types.js';
var BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';
// Powers of 85
var _85_1 = 85;
var _85_2 = 85 * 85;
var _85_3 = 85 * 85 * 85;
var _85_4 = 85 * 85 * 85 * 85;
function encodeBase85(bytes) {
    var encoded = '';
    var i = 0;
    for (i = 0; i + 3 < bytes.length; i += 4) {
        var value = (((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0);
        var block = '';
        for (var j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block;
    }
    var remaining = bytes.length - i;
    if (remaining > 0) {
        var temp = new Uint8Array(4);
        for (var j = 0; j < remaining; j++) {
            temp[j] = bytes[i + j];
        }
        var value = (((temp[0] << 24) | (temp[1] << 16) | (temp[2] << 8) | temp[3]) >>> 0);
        var block = '';
        for (var j = 0; j < 5; j++) {
            block = BASE85_ALPHABET[value % 85] + block;
            value = Math.floor(value / 85);
        }
        encoded += block.substring(0, remaining + 1);
    }
    return '@U' + encoded;
}
function mirrorBytes(bytes) {
    var mirrored = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
        var byte = bytes[i];
        var mirroredByte = 0;
        for (var j = 0; j < 8; j++) {
            mirroredByte |= ((byte >> j) & 1) << (7 - j);
        }
        mirrored[i] = mirroredByte;
    }
    return mirrored;
}
function IntBitsSize(v, minSize, maxSize) {
    var nBits = 0;
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
export function writeVarint(stream, value) {
    var VARINT_BITS_PER_BLOCK = 4;
    var VARINT_MAX_USABLE_BITS = 16;
    var nBits = IntBitsSize(value, 0, VARINT_MAX_USABLE_BITS);
    if (nBits === 0) {
        nBits = 1;
    }
    // Write complete blocks
    while (nBits > VARINT_BITS_PER_BLOCK) {
        for (var i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
            stream.writeBit(value & 1);
            value >>= 1;
        }
        stream.writeBit(1); // Continuation bit
        nBits -= VARINT_BITS_PER_BLOCK;
    }
    // Write partial last block
    if (nBits > 0) {
        for (var i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
            if (nBits > 0) {
                stream.writeBit(value & 1);
                value >>= 1;
                nBits--;
            }
            else {
                stream.writeBit(0); // Padding
            }
        }
        stream.writeBit(0); // No continuation
    }
}
export function writeVarbit(stream, value) {
    var VARBIT_LENGTH_BLOCK_SIZE = 5;
    var nBits = IntBitsSize(value, 0, (1 << VARBIT_LENGTH_BLOCK_SIZE) - 1);
    // Write length
    var lengthBits = nBits;
    for (var i = 0; i < VARBIT_LENGTH_BLOCK_SIZE; i++) {
        stream.writeBit(lengthBits & 1);
        lengthBits >>= 1;
    }
    // Write value bits
    var valueBits = value;
    for (var i = 0; i < nBits; i++) {
        stream.writeBit(valueBits & 1);
        valueBits >>= 1;
    }
}
function writePart(stream, part) {
    writeVarint(stream, part.index);
    switch (part.subType) {
        case SUBTYPE_NONE:
            stream.writeBits([0, 1, 0]);
            break;
        case SUBTYPE_INT:
            stream.writeBit(1);
            writeVarint(stream, part.value);
            stream.writeBits([0, 0, 0]);
            break;
        case SUBTYPE_LIST:
            stream.writeBits([0, 0, 1]);
            stream.writeBits([0, 1]); // TOK_SEP2
            for (var _i = 0, _a = part.values; _i < _a.length; _i++) {
                var v = _a[_i];
                if (v.type === TOK_VARINT) {
                    stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
                    writeVarint(stream, v.value);
                }
                else {
                    stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
                    writeVarbit(stream, v.value);
                }
            }
            stream.writeBits([0, 0]); // TOK_SEP1
            break;
    }
}
var TOKEN_BIT_PATTERNS = (_a = {},
    _a[TOK_SEP1] = [0, 0],
    _a[TOK_SEP2] = [0, 1],
    _a[TOK_VARINT] = [1, 0, 0],
    _a[TOK_VARBIT] = [1, 1, 0],
    _a[TOK_PART] = [1, 0, 1],
    _a);
export function encodeSerial(serial) {
    var stream = new Bitstream(new Uint8Array(250));
    // Magic header
    stream.write(16, 7);
    for (var _i = 0, serial_1 = serial; _i < serial_1.length; _i++) {
        var block = serial_1[_i];
        switch (block.token) {
            case TOK_SEP1:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP1]);
                break;
            case TOK_SEP2:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP2]);
                break;
            case TOK_VARINT:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
                writeVarint(stream, block.value);
                break;
            case TOK_VARBIT:
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
                writeVarbit(stream, block.value);
                break;
            case TOK_PART:
                if (!block.part) {
                    throw new Error('TOK_PART block is missing a part property');
                }
                stream.writeBits(TOKEN_BIT_PATTERNS[TOK_PART]);
                writePart(stream, block.part);
                break;
        }
    }
    var bytes = stream.bytes.slice(0, Math.ceil(stream.bit_pos / 8));
    var mirrored = mirrorBytes(bytes);
    return encodeBase85(mirrored);
}
