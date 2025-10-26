import { BitstreamReader, UINT4_MIRROR, UINT5_MIRROR } from './bitstream.js';
import type { Serial, Block, Part } from './types.js';
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
} from './types.js';

const BASE85_ALPHABET =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

/**
 * Decode Base85 Function
 * @name decodeBase85
 * @description Decodes a Base85 encoded string into a Uint8Array.
 * @param {string} encoded - The Base85 encoded string.
 * @returns {Uint8Array} The decoded byte array.
 */
export function decodeBase85(encoded: string): Uint8Array {
	if (encoded.startsWith('@U')) {
		encoded = encoded.substring(2);
	}

	const decoded: number[] = [];
	let buffer = 0;
	let bufferSize = 0;

	for (let i = 0; i < encoded.length; i++) {
		const char = encoded.charAt(i);
		const index = BASE85_ALPHABET.indexOf(char);
		if (index === -1) {
			throw new Error(`Invalid character in Base85 string: ${char}`);
		}

		buffer = buffer * 85 + index;
		bufferSize++;

		if (bufferSize === 5) {
			decoded.push((buffer >> 24) & 0xff);
			decoded.push((buffer >> 16) & 0xff);
			decoded.push((buffer >> 8) & 0xff);
			decoded.push(buffer & 0xff);
			buffer = 0;
			bufferSize = 0;
		}
	}

	if (bufferSize > 0) {
		if (bufferSize === 1) {
			throw new Error('Invalid Base85 string length');
		}
		const bytesToPush = bufferSize - 1;
		const padding = 5 - bufferSize;
		for (let i = 0; i < padding; i++) {
			buffer = buffer * 85 + 84;
		}
		for (let i = 0; i < bytesToPush; i++) {
			decoded.push((buffer >> (24 - i * 8)) & 0xff);
		}
	}

	return new Uint8Array(decoded);
}

export function mirrorBytes(bytes: Uint8Array): Uint8Array {
	const mirrored = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		let mirroredByte = 0;
		for (let j = 0; j < 8; j++) {
			mirroredByte |= ((byte >> j) & 1) << (7 - j);
		}
		mirrored[i] = mirroredByte;
	}
	return mirrored;
}

const UINT7_MIRROR = new Uint8Array(128);
for (let i = 0; i < 128; i++) {
	let mirrored = 0;
	for (let j = 0; j < 7; j++) {
		mirrored |= ((i >> j) & 1) << (6 - j);
	}
	UINT7_MIRROR[i] = mirrored;
}

class Tokenizer {
	stream: BitstreamReader;

	constructor(stream: BitstreamReader) {
		this.stream = stream;
	}

	async nextToken(): Promise<number | null> {
		const b1 = await this.stream.readBit();
		if (b1 === null) return null;

		if (b1 === 0) {
			const b2 = await this.stream.readBit();
			if (b2 === null) return null;
			return b2;
		}

		const b2 = await this.stream.readBit();
		if (b2 === null) return null;

		const b3 = await this.stream.readBit();
		if (b3 === null) return null;

		return (b1 << 2) | (b2 << 1) | b3;
	}
}

async function readVarint(stream: BitstreamReader): Promise<number> {
	let value = 0;
	let shift = 0;

	for (let i = 0; i < 4; i++) {
		const chunk = await stream.read(5);
		if (chunk === null) throw new Error('Unexpected end of stream in varint');

		const data = UINT4_MIRROR[chunk >> 1];
		value |= data << shift;
		shift += 4;

		if ((chunk & 1) === 0) {
			break;
		}
	}
	return value;
}

async function readVarbit(stream: BitstreamReader): Promise<number> {
	const length = await stream.read(5);
	if (length === null) throw new Error('Unexpected end of stream in varbit length');

	const mirroredLength = UINT5_MIRROR[length];
	if (mirroredLength === 0) return 0;

	let value = 0;
	for (let i = 0; i < mirroredLength; i++) {
		const bit = await stream.readBit();
		if (bit === null) throw new Error('Unexpected end of stream in varbit value');
		value |= bit << i;
	}

	return value;
}

async function readString(stream: BitstreamReader): Promise<string> {
	const length = await readVarint(stream);
	if (length === null) throw new Error('Unexpected end of stream in string length');

	let str = '';
	for (let i = 0; i < length; i++) {
		const charBits = await stream.read(7);
		if (charBits === null) throw new Error('Unexpected end of stream in string character');
		str += String.fromCharCode(UINT7_MIRROR[charBits]);
	}
	return str;
}

async function readPart(tokenizer: Tokenizer): Promise<Part> {
	const stream = tokenizer.stream;
	const index = await readVarint(stream);

	const flagType1 = await stream.readBit();
	if (flagType1 === null) throw new Error('Unexpected end of stream in part flag');

	if (flagType1 === 1) {
		const value = await readVarint(stream);
		await stream.read(3); // terminator 000
		return { subType: SUBTYPE_INT, index, value };
	}

	const flagType2 = await stream.read(2);
	if (flagType2 === null) throw new Error('Unexpected end of stream in part flag');

	if (flagType2 === 0b10) {
		return { subType: SUBTYPE_NONE, index };
	}

	if (flagType2 === 0b01) {
		const values: { type: number; value: number }[] = [];
		const listTokenType = await tokenizer.nextToken();
		if (listTokenType !== TOK_SEP2) {
			throw new Error('Expected TOK_SEP2 to start part list');
		}

		while (true) {
			const token = await tokenizer.nextToken();
			if (token === null) throw new Error('Unexpected end of stream in part list');

			if (token === TOK_SEP1) {
				break;
			}

			if (token === TOK_VARINT) {
				values.push({ type: TOK_VARINT, value: await readVarint(stream) });
			} else if (token === TOK_VARBIT) {
				values.push({ type: TOK_VARBIT, value: await readVarbit(stream) });
			} else {
				throw new Error(`Unexpected token in part list: ${token}`);
			}
		}
		return { subType: SUBTYPE_LIST, index, values };
	}

	throw new Error(`Unknown part flagType2: ${flagType2}`);
}

export async function parseBytes(bytes: Uint8Array, no_header?: boolean): Promise<Serial> {
	const mirrored = mirrorBytes(bytes);
	const stream = new BitstreamReader(mirrored);

	// copied from parseSerial
	// Magic header
	if (!no_header) {
		const magic = await stream.read(7);
		if (magic !== 0b0010000) {
			throw new Error('Invalid magic header');
		}
	}

	const tokenizer = new Tokenizer(stream);
	const blocks: Block[] = [];
	let trailingTerminators = 0;

	while (true) {
		const token = await tokenizer.nextToken();
		if (token === null) break;

		if (token === TOK_SEP1) {
			trailingTerminators++;
		} else {
			trailingTerminators = 0;
		}

		const block: Block = { token };

		switch (token) {
			case TOK_VARINT:
				block.value = await readVarint(stream);
				break;
			case TOK_VARBIT:
				block.value = await readVarbit(stream);
				break;
			case TOK_PART:
				block.part = await readPart(tokenizer);
				break;
			case TOK_STRING:
				block.valueStr = await readString(stream);
				break;
		}
		blocks.push(block);
	}

	if (trailingTerminators > 1) {
		blocks.splice(blocks.length - (trailingTerminators - 1));
	}

	return blocks;
}

/**
 * @name parseSerial
 * @description Parses a Base85 encoded serial string into a serial object.
 * @param {string} serial - The Base85 encoded serial string.
 * @returns {Promise<Serial>} A promise that resolves to the serial object.
 */
export async function parseSerial(serial: string): Promise<Serial> {
	const decoded = decodeBase85(serial);
	const mirrored = mirrorBytes(decoded);

	const stream = new BitstreamReader(mirrored);

	// Magic header
	const magic = await stream.read(7);
	if (magic !== 0b0010000) {
		throw new Error('Invalid magic header');
	}

	const tokenizer = new Tokenizer(stream);
	const blocks: Block[] = [];
	let trailingTerminators = 0;

	while (true) {
		const token = await tokenizer.nextToken();
		if (token === null) break;

		if (token === TOK_SEP1) {
			trailingTerminators++;
		} else {
			trailingTerminators = 0;
		}

		const block: Block = { token };

		switch (token) {
			case TOK_VARINT:
				block.value = await readVarint(stream);
				break;
			case TOK_VARBIT:
				block.value = await readVarbit(stream);
				break;
			case TOK_PART:
				block.part = await readPart(tokenizer);
				break;
			case TOK_STRING:
				block.valueStr = await readString(stream);
				break;
		}
		blocks.push(block);
	}

	if (trailingTerminators > 1) {
		blocks.splice(blocks.length - (trailingTerminators - 1));
	}

	return blocks;
}
