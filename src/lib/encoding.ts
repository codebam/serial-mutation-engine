export const BASE85_ALPHABET =
	'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

export function encodeBase85(bytes: Uint8Array): string {
	let encoded = '';
	let i = 0;

	for (i = 0; i + 3 < bytes.length; i += 4) {
		let value =
			((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
		let block = '';
		for (let j = 0; j < 5; j++) {
			block = BASE85_ALPHABET[value % 85] + block;
			value = Math.floor(value / 85);
		}
		encoded += block;
	}

	const remaining = bytes.length - i;
	if (remaining > 0) {
		const temp = new Uint8Array(4);
		for (let j = 0; j < remaining; j++) {
			temp[j] = bytes[i + j];
		}

		let value = ((temp[0] << 24) | (temp[1] << 16) | (temp[2] << 8) | temp[3]) >>> 0;
		let block = '';
		for (let j = 0; j < 5; j++) {
			block = BASE85_ALPHABET[value % 85] + block;
			value = Math.floor(value / 85);
		}
		encoded += block.substring(0, remaining + 1);
	}

	return '@U' + encoded;
}

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
