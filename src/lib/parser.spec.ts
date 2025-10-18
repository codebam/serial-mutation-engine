import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';
import * as fs from 'fs';

describe('parser and encoder', () => {
    it('should parse and encode a serial, maintaining integrity', () => {
        const originalSerial = '@Ug!pHG2__CA%-;ighq}}VgX){wV^ARtDz8D^IjFh^RXZ9KIRF';
        const binary = serialToBinary(originalSerial);
        fs.writeFileSync('./original', binary);
        const parsed = parse(binary);
        const newSerial = parsedToSerial(parsed);
        expect(newSerial).toBe(originalSerial);
    });
});