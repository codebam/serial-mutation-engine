export const UINT4_MIRROR: number[] = [];
for (let i = 0; i < 16; i++) {
	UINT4_MIRROR[i] = ((i & 0x01) << 3) | ((i & 0x02) << 1) | ((i & 0x04) >> 1) | ((i & 0x08) >> 3);
}

export const UINT5_MIRROR: number[] = [];
for (let i = 0; i < 32; i++) {
	UINT5_MIRROR[i] =
		((i & 0x01) << 4) | ((i & 0x02) << 2) | (i & 0x04) | ((i & 0x08) >> 2) | ((i & 0x10) >> 4);
}

export class Bitstream {
	bytes: Uint8Array;
	bit_pos: number;

	constructor(bytes: Uint8Array) {
		this.bytes = bytes;
		this.bit_pos = 0;
	}

	read(n: number): number | null {
		if (this.bit_pos + n > this.bytes.length * 8) {
			return null;
		}
		let value = 0;
		for (let i = 0; i < n; i++) {
			const byte_pos = Math.floor((this.bit_pos + i) / 8);
			const bit_offset = 7 - ((this.bit_pos + i) % 8);
			const bit = (this.bytes[byte_pos] >> bit_offset) & 1;
			value = (value << 1) | bit;
		}
		this.bit_pos += n;
		return value;
	}

	write(value: number, n: number) {
		for (let i = 0; i < n; i++) {
			const bit = (value >> (n - 1 - i)) & 1;
			const byte_pos = Math.floor(this.bit_pos / 8);
			const bit_offset = 7 - (this.bit_pos % 8);
			if (byte_pos >= this.bytes.length) {
				const new_bytes = new Uint8Array(byte_pos + 1);
				new_bytes.set(this.bytes);
				this.bytes = new_bytes;
			}
			if (bit) {
				this.bytes[byte_pos] |= 1 << bit_offset;
			} else {
				this.bytes[byte_pos] &= ~(1 << bit_offset);
			}
			this.bit_pos++;
		}
	}

	readBit(): number | null {
		return this.read(1);
	}

	writeBit(bit: number) {
		this.write(bit, 1);
	}

	readBits(n: number): number[] | null {
		const bits: number[] = [];
		for (let i = 0; i < n; i++) {
			const bit = this.readBit();
			if (bit === null) {
				return null;
			}
			bits.push(bit);
		}
		return bits;
	}

	writeBits(bits: number[]) {
		for (const bit of bits) {
			this.writeBit(bit);
		}
	}

	rewind(n: number) {
		this.bit_pos -= n;
	}

	clone(): Bitstream {
		const new_stream = new Bitstream(new Uint8Array(this.bytes));
		new_stream.bit_pos = this.bit_pos;
		return new_stream;
	}
}
