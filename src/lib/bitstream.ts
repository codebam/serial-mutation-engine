export const UINT4_MIRROR: number[] = [];
for (let i = 0; i < 16; i++) {
	UINT4_MIRROR[i] = ((i & 0x01) << 3) | ((i & 0x02) << 1) | ((i & 0x04) >> 1) | ((i & 0x08) >> 3);
}

export const UINT5_MIRROR: number[] = [];
for (let i = 0; i < 32; i++) {
	UINT5_MIRROR[i] =
		((i & 0x01) << 4) | ((i & 0x02) << 2) | (i & 0x04) | ((i & 0x08) >> 2) | ((i & 0x10) >> 4);
}

export const UINT7_MIRROR = new Uint8Array(128);
for (let i = 0; i < 128; i++) {
	let mirrored = 0;
	for (let j = 0; j < 7; j++) {
		mirrored |= ((i >> j) & 1) << (6 - j);
	}
	UINT7_MIRROR[i] = mirrored;
}

export class BitstreamWriter {
	private stream: WritableStream<Uint8Array>;
	private writer: WritableStreamDefaultWriter<Uint8Array>;
	private chunks: Uint8Array[] = [];
	private bit_buffer = 0;
	private bit_length = 0;
	public written_bits = 0;

	constructor() {
		const sink = {
			write: (chunk: Uint8Array) => {
				this.chunks.push(chunk);
			}
		};
		this.stream = new WritableStream(sink);
		this.writer = this.stream.getWriter();
	}

	private async flush(force = false) {
		while (this.bit_length >= 8) {
			const byte = (this.bit_buffer >> (this.bit_length - 8)) & 0xff;
			await this.writer.write(new Uint8Array([byte]));
			this.bit_length -= 8;
		}
		if (force && this.bit_length > 0) {
			const byte = (this.bit_buffer << (8 - this.bit_length)) & 0xff;
			await this.writer.write(new Uint8Array([byte]));
			this.bit_length = 0;
			this.bit_buffer = 0;
		}
	}

	public async write(value: number, n: number) {
		this.written_bits += n;
		value &= (1 << n) - 1;
		this.bit_buffer = (this.bit_buffer << n) | value;
		this.bit_length += n;
		await this.flush();
	}

	public async writeBit(bit: number) {
		await this.write(bit, 1);
	}

	public async writeBits(bits: number[]) {
		for (const bit of bits) {
			await this.writeBit(bit);
		}
	}

	public async getBytes(): Promise<Uint8Array> {
		await this.flush(true);
		await this.writer.close();

		const result = new Uint8Array(this.chunks.reduce((acc, chunk) => acc + chunk.length, 0));
		let offset = 0;
		for (const chunk of this.chunks) {
			result.set(chunk, offset);
			offset += chunk.length;
		}
		return result;
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
