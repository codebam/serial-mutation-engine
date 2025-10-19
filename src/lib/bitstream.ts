export class Bitstream {
    bytes: number[];
    bit_pos: number;

    constructor(bytes: number[]) {
        this.bytes = bytes;
        this.bit_pos = 0;
    }

    read(length: number): number | null {
        if (this.bit_pos + length > this.bytes.length * 8) {
            return null;
        }

        let result = 0;
        for (let i = 0; i < length; i++) {
            const byte_index = Math.floor((this.bit_pos + i) / 8);
            const bit_index = (this.bit_pos + i) % 8;
            const byte = this.bytes[byte_index];
            const bit = (byte >> (7 - bit_index)) & 1;
            result = (result << 1) | bit;
        }
        this.bit_pos += length;
        return result;
    }

    eof(): boolean {
        return this.bit_pos >= this.bytes.length * 8;
    }
}