import { Bitstream, UINT4_MIRROR, UINT5_MIRROR } from './bitstream.js';
import { SUBTYPE_INT, SUBTYPE_LIST, SUBTYPE_NONE, TOK_SEP1, TOK_SEP2, TOK_VARINT, TOK_VARBIT, TOK_PART, TOK_UNSUPPORTED_111 } from './types.js';
var BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';
function decodeBase85(encoded) {
    if (encoded.startsWith('@U')) {
        encoded = encoded.substring(2);
    }
    var decoded = [];
    var buffer = 0;
    var bufferSize = 0;
    for (var i = 0; i < encoded.length; i++) {
        var char = encoded.charAt(i);
        var index = BASE85_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error("Invalid character in Base85 string: ".concat(char));
        }
        buffer = buffer * 85 + index;
        bufferSize++;
        if (bufferSize === 5) {
            decoded.push((buffer >> 24) & 0xFF);
            decoded.push((buffer >> 16) & 0xFF);
            decoded.push((buffer >> 8) & 0xFF);
            decoded.push(buffer & 0xFF);
            buffer = 0;
            bufferSize = 0;
        }
    }
    if (bufferSize > 0) {
        if (bufferSize === 1) {
            throw new Error('Invalid Base85 string length');
        }
        var bytesToPush = bufferSize - 1;
        var padding = 5 - bufferSize;
        for (var i = 0; i < padding; i++) {
            buffer = buffer * 85 + 84;
        }
        for (var i = 0; i < bytesToPush; i++) {
            decoded.push((buffer >> (24 - i * 8)) & 0xFF);
        }
    }
    return new Uint8Array(decoded);
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
var Tokenizer = /** @class */ (function () {
    function Tokenizer(stream) {
        this.stream = stream;
    }
    Tokenizer.prototype.nextToken = function () {
        var b1 = this.stream.readBit();
        if (b1 === null)
            return null;
        if (b1 === 0) {
            var b2_1 = this.stream.readBit();
            if (b2_1 === null)
                return null;
            return b2_1;
        }
        var b2 = this.stream.readBit();
        if (b2 === null)
            return null;
        var b3 = this.stream.readBit();
        if (b3 === null)
            return null;
        return (b1 << 2) | (b2 << 1) | b3;
    };
    return Tokenizer;
}());
function readVarint(stream) {
    var value = 0;
    var shift = 0;
    for (var i = 0; i < 4; i++) {
        var chunk = stream.read(5);
        if (chunk === null)
            throw new Error('Unexpected end of stream in varint');
        var data = UINT4_MIRROR[chunk >> 1];
        value |= data << shift;
        shift += 4;
        if ((chunk & 1) === 0) {
            break;
        }
    }
    return value;
}
function readVarbit(stream) {
    var length = stream.read(5);
    if (length === null)
        throw new Error('Unexpected end of stream in varbit length');
    var mirroredLength = UINT5_MIRROR[length];
    if (mirroredLength === 0)
        return 0;
    var value = 0;
    for (var i = 0; i < mirroredLength; i++) {
        var bit = stream.readBit();
        if (bit === null)
            throw new Error('Unexpected end of stream in varbit value');
        value |= bit << i;
    }
    return value;
}
function readPart(tokenizer) {
    var stream = tokenizer.stream;
    var index = readVarint(stream);
    var flagType1 = stream.readBit();
    if (flagType1 === null)
        throw new Error('Unexpected end of stream in part flag');
    if (flagType1 === 1) {
        var value = readVarint(stream);
        stream.read(3); // terminator 000
        return { subType: SUBTYPE_INT, index: index, value: value };
    }
    var flagType2 = stream.read(2);
    if (flagType2 === null)
        throw new Error('Unexpected end of stream in part flag');
    if (flagType2 === 2) {
        return { subType: SUBTYPE_NONE, index: index };
    }
    if (flagType2 === 1) {
        var values = [];
        var listTokenType = tokenizer.nextToken();
        if (listTokenType !== TOK_SEP2) {
            throw new Error('Expected TOK_SEP2 to start part list');
        }
        while (true) {
            var token = tokenizer.nextToken();
            if (token === null)
                throw new Error('Unexpected end of stream in part list');
            if (token === TOK_SEP1) {
                break;
            }
            if (token === TOK_VARINT) {
                values.push({ type: TOK_VARINT, value: readVarint(stream) });
            }
            else if (token === TOK_VARBIT) {
                values.push({ type: TOK_VARBIT, value: readVarbit(stream) });
            }
            else {
                throw new Error("Unexpected token in part list: ".concat(token));
            }
        }
        return { subType: SUBTYPE_LIST, index: index, values: values };
    }
    throw new Error("Unknown part flagType2: ".concat(flagType2));
}
export function parseSerial(serial) {
    var decoded = decodeBase85(serial);
    var mirrored = mirrorBytes(decoded);
    var stream = new Bitstream(mirrored);
    // Magic header
    var magic = stream.read(7);
    if (magic !== 16) {
        throw new Error('Invalid magic header');
    }
    var tokenizer = new Tokenizer(stream);
    var blocks = [];
    var partBlocksFound = false;
    var trailingTerminators = 0;
    while (true) {
        var token = tokenizer.nextToken();
        if (token === null)
            break;
        if (token === TOK_UNSUPPORTED_111) {
            if (partBlocksFound) {
                break;
            }
            else {
                throw new Error('Unsupported DLC item (TOK_UNSUPPORTED_111)');
            }
        }
        if (token === TOK_SEP1) {
            trailingTerminators++;
        }
        else {
            trailingTerminators = 0;
        }
        var block = { token: token };
        switch (token) {
            case TOK_VARINT:
                block.value = readVarint(stream);
                break;
            case TOK_VARBIT:
                block.value = readVarbit(stream);
                break;
            case TOK_PART:
                block.part = readPart(tokenizer);
                partBlocksFound = true;
                break;
        }
        blocks.push(block);
    }
    while (trailingTerminators > 1) {
        blocks.pop();
        trailingTerminators--;
    }
    return blocks;
}
