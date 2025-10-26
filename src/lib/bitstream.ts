export const UINT4_MIRROR: number[] = [];
for (let i = 0; i < 16; i++) {
	UINT4_MIRROR[i] = ((i & 0x01) << 3) | ((i & 0x02) << 1) | ((i & 0x04) >> 1) | ((i & 0x08) >> 3);
}

export const UINT5_MIRROR: number[] = [];
for (let i = 0; i < 32; i++) {
	UINT5_MIRROR[i] =
		((i & 0x01) << 4) | ((i & 0x02) << 2) | (i & 0x04) | ((i & 0x08) >> 2) | ((i & 0x10) >> 4);
}

export class BitstreamWriter {
	bytes: Uint8Array;
	bit_pos: number;

	constructor(initialSize: number = 250) {
		this.bytes = new Uint8Array(initialSize);
		this.bit_pos = 0;
	}

	write(value: number, n: number) {
		for (let i = 0; i < n; i++) {
			const bit = (value >> (n - 1 - i)) & 1;
			const byte_pos = Math.floor(this.bit_pos / 8);
			const bit_offset = 7 - (this.bit_pos % 8);
			if (byte_pos >= this.bytes.length) {
				const new_bytes = new Uint8Array(this.bytes.length * 2);
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

	writeBit(bit: number) {
		this.write(bit, 1);
	}

	writeBits(bits: number[]) {
		for (const bit of bits) {
			this.writeBit(bit);
		}
	}

	getBytes(): Uint8Array {
		return this.bytes.slice(0, Math.ceil(this.bit_pos / 8));
	}
}

export class BitstreamReader {
	private reader: ReadableStreamDefaultReader<Uint8Array>;
	private buffer: Uint8Array = new Uint8Array(0);
	private bit_pos = 0;

	constructor(bytes: Uint8Array) {
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(bytes);
				controller.close();
			}
		});
		this.reader = stream.getReader();
	}

	private async ensureBits(n: number) {
		while (this.buffer.length * 8 - this.bit_pos < n) {
			const { done, value } = await this.reader.read();
			if (done) {
				return;
			}
			const newBuffer = new Uint8Array(this.buffer.length + value.length);
			newBuffer.set(this.buffer);
			newBuffer.set(value, this.buffer.length);
			this.buffer = newBuffer;
		}
	}

	public async read(n: number): Promise<number | null> {
		await this.ensureBits(n);

		if (this.bit_pos + n > this.buffer.length * 8) {
			return null;
		}

		let value = 0;
		for (let i = 0; i < n; i++) {
			const current_bit_pos = this.bit_pos + i;
			const byte_pos = Math.floor(current_bit_pos / 8);
			const bit_offset = 7 - (current_bit_pos % 8);
			const bit = (this.buffer[byte_pos] >> bit_offset) & 1;
			value = (value << 1) | bit;
		}
		this.bit_pos += n;
		return value;
	}

	public async readBit(): Promise<number | null> {
		return this.read(1);
	}

	public async readBits(n: number): Promise<number[] | null> {
		const bits: number[] = [];
		for (let i = 0; i < n; i++) {
			const bit = await this.readBit();
			if (bit === null) {
				return null;
			}
			bits.push(bit);
		}
		return bits;
	}

	public rewind(n: number) {
		this.bit_pos -= n;
	}
}
