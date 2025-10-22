export var UINT4_MIRROR = [];
for (var i = 0; i < 16; i++) {
    UINT4_MIRROR[i] = (i & 0x01) << 3 | (i & 0x02) << 1 | (i & 0x04) >> 1 | (i & 0x08) >> 3;
}
export var UINT5_MIRROR = [];
for (var i = 0; i < 32; i++) {
    UINT5_MIRROR[i] = (i & 0x01) << 4 | (i & 0x02) << 2 | (i & 0x04) | (i & 0x08) >> 2 | (i & 0x10) >> 4;
}
var Bitstream = /** @class */ (function () {
    function Bitstream(bytes) {
        this.bytes = bytes;
        this.bit_pos = 0;
    }
    Bitstream.prototype.read = function (n) {
        if (this.bit_pos + n > this.bytes.length * 8) {
            return null;
        }
        var value = 0;
        for (var i = 0; i < n; i++) {
            var byte_pos = Math.floor((this.bit_pos + i) / 8);
            var bit_offset = 7 - ((this.bit_pos + i) % 8);
            var bit = (this.bytes[byte_pos] >> bit_offset) & 1;
            value = (value << 1) | bit;
        }
        this.bit_pos += n;
        return value;
    };
    Bitstream.prototype.write = function (value, n) {
        for (var i = 0; i < n; i++) {
            var bit = (value >> (n - 1 - i)) & 1;
            var byte_pos = Math.floor(this.bit_pos / 8);
            var bit_offset = 7 - (this.bit_pos % 8);
            if (byte_pos >= this.bytes.length) {
                var new_bytes = new Uint8Array(byte_pos + 1);
                new_bytes.set(this.bytes);
                this.bytes = new_bytes;
            }
            if (bit) {
                this.bytes[byte_pos] |= 1 << bit_offset;
            }
            else {
                this.bytes[byte_pos] &= ~(1 << bit_offset);
            }
            this.bit_pos++;
        }
    };
    Bitstream.prototype.readBit = function () {
        return this.read(1);
    };
    Bitstream.prototype.writeBit = function (bit) {
        this.write(bit, 1);
    };
    Bitstream.prototype.readBits = function (n) {
        var bits = [];
        for (var i = 0; i < n; i++) {
            var bit = this.readBit();
            if (bit === null) {
                return null;
            }
            bits.push(bit);
        }
        return bits;
    };
    Bitstream.prototype.writeBits = function (bits) {
        for (var _i = 0, bits_1 = bits; _i < bits_1.length; _i++) {
            var bit = bits_1[_i];
            this.writeBit(bit);
        }
    };
    Bitstream.prototype.rewind = function (n) {
        this.bit_pos -= n;
    };
    Bitstream.prototype.clone = function () {
        var new_stream = new Bitstream(new Uint8Array(this.bytes));
        new_stream.bit_pos = this.bit_pos;
        return new_stream;
    };
    return Bitstream;
}());
export { Bitstream };
