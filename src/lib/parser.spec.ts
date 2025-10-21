
import { describe, it, expect } from 'vitest';
import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import * as fs from 'fs';

describe('parser and encoder roundtrip', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0).slice(0, 200);;

    serials.forEach((serial, index) => {
        it(`should correctly parse and encode serial #${index + 1}`, () => {
            const parsed = parseSerial(serial);
            const encoded = encodeSerial(parsed);
            expect(encoded).toBe(serial);
        });
    });
});

describe('TypeScript vs Go implementation', () => {
    const goOutput = fs.readFileSync('./go_output.txt', 'utf-8').split('\n').filter(s => s.length > 0).slice(0,100);

    goOutput.forEach((line, index) => {
        const [originalSerial, goEncodedSerial] = line.split(',');
        it(`should match Go's re-encoded serial for line #${index + 1}`, () => {
            const parsed = parseSerial(originalSerial);
            const encoded = encodeSerial(parsed);
            expect(encoded).toBe(goEncodedSerial);
        });
    });
});
