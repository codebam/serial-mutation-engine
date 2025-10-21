import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Go implementation roundtrip vs original serials', () => {
    const goOutput = fs.readFileSync('./go_output.txt', 'utf-8').split('\n').filter(s => s.length > 0);
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    goOutput.forEach((line, index) => {
        const [originalSerialFromGo, goEncodedSerial] = line.split(',');
        const originalSerialFromFile = serials[index];

        it(`should have matching serials for line #${index + 1}`, () => {
            expect(originalSerialFromFile).toBe(originalSerialFromGo);
            expect(originalSerialFromFile).toBe(goEncodedSerial);
        });
    });
});
