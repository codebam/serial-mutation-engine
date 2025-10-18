import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';
import * as fs from 'fs';

describe('parser and encoder', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should parse and encode serial %s, maintaining integrity', (originalSerial) => {
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
        const newSerial = parsedToSerial(parsed);
        expect(newSerial).toBe(originalSerial);
    });
});