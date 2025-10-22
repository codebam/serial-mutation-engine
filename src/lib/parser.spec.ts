
import { describe, it, expect } from 'vitest';
import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import * as fs from 'fs';
import { Bitstream } from './bitstream';

// Helper function to decode and print binary
function toBinary(serial: string): string {
    // These functions are not exported, so they are copied here for testing
    const BASE85_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{/}~';

    function decodeBase85(encoded: string): Uint8Array {
        if (encoded.startsWith('@U')) {
            encoded = encoded.substring(2);
        }

        let decoded: number[] = [];
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
                decoded.push((buffer >> 24) & 0xFF);
                decoded.push((buffer >> 16) & 0xFF);
                decoded.push((buffer >> 8) & 0xFF);
                decoded.push(buffer & 0xFF);
                buffer = 0;
                bufferSize = 0;
            }
        }

        if (bufferSize > 0) {
            const padding = 5 - bufferSize;
            for (let i = 0; i < padding; i++) {
                buffer = buffer * 85 + 84;
            }
            const bytesToPush = 4 - padding;
            for (let i = 0; i < bytesToPush; i++) {
                decoded.push((buffer >> (24 - i * 8)) & 0xFF);
            }
        }

        return new Uint8Array(decoded);
    }

    function mirrorBytes(bytes: Uint8Array): Uint8Array {
        const mirrored = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            let byte = bytes[i];
            let mirroredByte = 0;
            for (let j = 0; j < 8; j++) {
                mirroredByte |= ((byte >> j) & 1) << (7 - j);
            }
            mirrored[i] = mirroredByte;
        }
        return mirrored;
    }

    const decoded = decodeBase85(serial);
    const mirrored = mirrorBytes(decoded);
    let binaryString = '';
    for (const byte of mirrored) {
        binaryString += byte.toString(2).padStart(8, '0');
    }
    return binaryString;
}


describe('parser and encoder roundtrip', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    const serial = '@Ugb)KvFme##l0zsbs!)x(i8_g@R2bA7)E!hF)GO34#KYKZ0R';
    it.only(`should correctly parse and encode serial #1010`, () => {
        const parsed = parseSerial(serial);
        const encoded = encodeSerial(parsed);

        console.log('Original Serial:', serial);
        console.log('Encoded Serial: ', encoded);
        console.log('Parsed:', JSON.stringify(parsed, null, 2));

        const originalBinary = toBinary(serial);
        const encodedBinary = toBinary(encoded);

        console.log('Original Binary:', originalBinary);
        console.log('Encoded Binary: ', encodedBinary);

        // Find the first differing bit
        let diffIndex = -1;
        for (let i = 0; i < originalBinary.length; i++) {
            if (originalBinary[i] !== encodedBinary[i]) {
                diffIndex = i;
                break;
            }
        }
        if (diffIndex !== -1) {
            console.log(`Binary strings differ at index ${diffIndex}`);
            console.log('Original:', originalBinary.substring(diffIndex - 10, diffIndex + 10));
            console.log('Encoded: ', encodedBinary.substring(diffIndex - 10, diffIndex + 10));
        }


        expect(encoded).toBe(serial);
    });

    serials.forEach((serial, index) => {
        it(`should correctly parse and encode serial #${index + 1}`, () => {
            const parsed = parseSerial(serial);
            const encoded = encodeSerial(parsed);
            expect(encoded).toBe(serial);
        });
    });
});

describe('TypeScript vs Go implementation', () => {
    const goOutput = fs.readFileSync('./go_output.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    goOutput.forEach((line, index) => {
        const [originalSerial, goEncodedSerial] = line.split(',');
        it(`should match Go's re-encoded serial for line #${index + 1}`, () => {
            const parsed = parseSerial(originalSerial);
            const encoded = encodeSerial(parsed);
            expect(encoded).toBe(goEncodedSerial);
        });
    });
});
