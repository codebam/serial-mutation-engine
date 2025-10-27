import { BitstreamWriter, UINT7_MIRROR } from './bitstream.ts';
import { encodeBase85, mirrorBytes } from './encoding.ts';
import type { Serial, Part } from './types.ts';
import {
	SUBTYPE_INT,
	SUBTYPE_LIST,
	SUBTYPE_NONE,
	TOK_SEP1,
	TOK_SEP2,
	TOK_VARINT,
	TOK_VARBIT,
	TOK_PART,
	TOK_STRING
} from './types.ts';

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

export async function writeVarint(stream: BitstreamWriter, value: number): Promise<void> {
	const VARINT_BITS_PER_BLOCK = 4;
	const VARINT_MAX_USABLE_BITS = 16;

	let nBits = IntBitsSize(value, 0, VARINT_MAX_USABLE_BITS);
	if (nBits === 0) {
		nBits = 1;
	}

	// Write complete blocks
	while (nBits > VARINT_BITS_PER_BLOCK) {
		for (let i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
			await stream.writeBit(value & 1);
			value >>= 1;
		}
		await stream.writeBit(1); // Continuation bit
		nBits -= VARINT_BITS_PER_BLOCK;
	}

	// Write partial last block
	if (nBits > 0) {
		for (let i = 0; i < VARINT_BITS_PER_BLOCK; i++) {
			if (nBits > 0) {
				await stream.writeBit(value & 1);
				value >>= 1;
				nBits--;
			} else {
				await stream.writeBit(0); // Padding
			}
		}
		await stream.writeBit(0); // No continuation
	}
}

export async function writeVarbit(stream: BitstreamWriter, value: number): Promise<void> {
	const VARBIT_LENGTH_BLOCK_SIZE = 5;
	const nBits = IntBitsSize(value, 0, (1 << VARBIT_LENGTH_BLOCK_SIZE) - 1);

	// Write length
	let lengthBits = nBits;
	for (let i = 0; i < VARBIT_LENGTH_BLOCK_SIZE; i++) {
		await stream.writeBit(lengthBits & 1);
		lengthBits >>= 1;
	}

	// Write value bits
	let valueBits = value;
	for (let i = 0; i < nBits; i++) {
		await stream.writeBit(valueBits & 1);
		valueBits >>= 1;
	}
}

async function writeString(stream: BitstreamWriter, value: string): Promise<void> {
	await writeVarint(stream, value.length);
	for (let i = 0; i < value.length; i++) {
		const charCode = value.charCodeAt(i);
		await stream.write(UINT7_MIRROR[charCode], 7);
	}
}

async function writePart(stream: BitstreamWriter, part: Part): Promise<void> {
	await writeVarint(stream, part.index);

	switch (part.subType) {
		case SUBTYPE_NONE:
			await stream.writeBits([0, 1, 0]);
			break;
		case SUBTYPE_INT:
			await stream.writeBit(1);
			await writeVarint(stream, part.value!);
			await stream.writeBits([0, 0, 0]);
			break;
		case SUBTYPE_LIST:
			await stream.writeBits([0, 0, 1]);
			await stream.writeBits([0, 1]); // TOK_SEP2
			for (const v of part.values!) {
				if (v.type === TOK_VARINT) {
					await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
					await writeVarint(stream, v.value);
				} else {
					await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
					await writeVarbit(stream, v.value);
				}
			}
			await stream.writeBits([0, 0]); // TOK_SEP1
			break;
	}
}

const TOKEN_BIT_PATTERNS = {
	[TOK_SEP1]: [0, 0],
	[TOK_SEP2]: [0, 1],
	[TOK_VARINT]: [1, 0, 0],
	[TOK_VARBIT]: [1, 1, 0],
	[TOK_PART]: [1, 0, 1],
	[TOK_STRING]: [1, 1, 1]
};

/**
 * @name encodeSerial
 * @description Encodes a serial object into a Base85 encoded serial string.
 * @param {Serial} serial - The serial object.
 * @returns {Promise<string>} A promise that resolves to the Base85 encoded serial string.
 */
export async function encodeSerial(serial: Serial): Promise<string> {
	const stream = new BitstreamWriter();

	// Magic header
	await stream.write(0b0010000, 7);

	for (const block of serial) {
		switch (block.token) {
			case TOK_SEP1:
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP1]);
				break;
			case TOK_SEP2:
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_SEP2]);
				break;
			case TOK_VARINT:
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARINT]);
				await writeVarint(stream, block.value!);
				break;
			case TOK_VARBIT:
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_VARBIT]);
				await writeVarbit(stream, block.value!);
				break;
			case TOK_PART:
				if (!block.part) {
					throw new Error('TOK_PART block is missing a part property');
				}
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_PART]);
				await writePart(stream, block.part!);
				break;
			case TOK_STRING:
				if (block.valueStr === undefined) {
					throw new Error('TOK_STRING block is missing a valueStr property');
				}
				await stream.writeBits(TOKEN_BIT_PATTERNS[TOK_STRING]);
				await writeString(stream, block.valueStr);
				break;
		}
	}

	const bytes = await stream.getBytes();
	const mirrored = mirrorBytes(bytes);
	return encodeBase85(mirrored);
}
