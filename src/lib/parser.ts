import { Bitstream, UINT4_MIRROR, UINT5_MIRROR } from './bitstream.js';
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
	TOK_UNSUPPORTED_111
} from './types.js';

const BASE85_ALPHABET =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

function decodeBase85(encoded: string): Uint8Array {
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

function mirrorBytes(bytes: Uint8Array): Uint8Array {
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

class Tokenizer {
	stream: Bitstream;

	constructor(stream: Bitstream) {
		this.stream = stream;
	}

	nextToken(): number | null {
		const b1 = this.stream.readBit();
		if (b1 === null) return null;

		if (b1 === 0) {
			const b2 = this.stream.readBit();
			if (b2 === null) return null;
			return b2;
		}

		const b2 = this.stream.readBit();
		if (b2 === null) return null;

		const b3 = this.stream.readBit();
		if (b3 === null) return null;

		return (b1 << 2) | (b2 << 1) | b3;
	}
}

function readVarint(stream: Bitstream): number {
	let value = 0;
	let shift = 0;

	for (let i = 0; i < 4; i++) {
		const chunk = stream.read(5);
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

function readVarbit(stream: Bitstream): number {
	const length = stream.read(5);
	if (length === null) throw new Error('Unexpected end of stream in varbit length');

	const mirroredLength = UINT5_MIRROR[length];
	if (mirroredLength === 0) return 0;

	let value = 0;
	for (let i = 0; i < mirroredLength; i++) {
		const bit = stream.readBit();
		if (bit === null) throw new Error('Unexpected end of stream in varbit value');
		value |= bit << i;
	}

	return value;
}

function readPart(tokenizer: Tokenizer): Part {
	const stream = tokenizer.stream;
	const index = readVarint(stream);

	const flagType1 = stream.readBit();
	if (flagType1 === null) throw new Error('Unexpected end of stream in part flag');

	if (flagType1 === 1) {
		const value = readVarint(stream);
		stream.read(3); // terminator 000
		return { subType: SUBTYPE_INT, index, value };
	}

	const flagType2 = stream.read(2);
	if (flagType2 === null) throw new Error('Unexpected end of stream in part flag');

	if (flagType2 === 0b10) {
		return { subType: SUBTYPE_NONE, index };
	}

	if (flagType2 === 0b01) {
		const values: { type: number; value: number }[] = [];
		const listTokenType = tokenizer.nextToken();
		if (listTokenType !== TOK_SEP2) {
			throw new Error('Expected TOK_SEP2 to start part list');
		}

		while (true) {
			const token = tokenizer.nextToken();
			if (token === null) throw new Error('Unexpected end of stream in part list');

			if (token === TOK_SEP1) {
				break;
			}

			if (token === TOK_VARINT) {
				values.push({ type: TOK_VARINT, value: readVarint(stream) });
			} else if (token === TOK_VARBIT) {
				values.push({ type: TOK_VARBIT, value: readVarbit(stream) });
			} else {
				throw new Error(`Unexpected token in part list: ${token}`);
			}
		}
		return { subType: SUBTYPE_LIST, index, values };
	}

	throw new Error(`Unknown part flagType2: ${flagType2}`);
}

export function parseSerial(
	serial: string,
	progressCallback?: (bit: number) => void
): { blocks: Serial; bitstream: Uint8Array } {
	const decoded = decodeBase85(serial);
	const mirrored = mirrorBytes(decoded);

	const stream = new Bitstream(mirrored);

	// Magic header
	const magic = stream.read(7);
	if (magic !== 0b0010000) {
		throw new Error('Invalid magic header');
	}

	const tokenizer = new Tokenizer(stream);
	const blocks: Block[] = [];
	let partBlocksFound = false;
	let trailingTerminators = 0;

	// Wrap stream.readBit to call progressCallback
	const originalReadBit = stream.readBit.bind(stream);
	stream.readBit = () => {
		const bit = originalReadBit();
		if (bit !== null && progressCallback) {
			progressCallback(bit);
		}
		return bit;
	};

	while (true) {
		const token = tokenizer.nextToken();
		if (token === null) break;

		if (token === TOK_UNSUPPORTED_111) {
			if (partBlocksFound) {
				break;
			} else {
				throw new Error('Unsupported DLC item (TOK_UNSUPPORTED_111)');
			}
		}

		if (token === TOK_SEP1) {
			trailingTerminators++;
		} else {
			trailingTerminators = 0;
		}

		const block: Block = { token };

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

	return { blocks, bitstream: mirrored };
}
