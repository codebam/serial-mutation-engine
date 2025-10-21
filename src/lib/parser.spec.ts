import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBytes } from './decode';
import * as fs from 'fs';
import { Bitstream } from './bitstream';
import * as utils from './utils';

describe('parser and encoder', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should parse and encode serial %s, maintaining integrity', (originalSerial) => {
        const originalBytes = serialToBytes(originalSerial);
        const parsed1 = parse(originalBytes, 'varint', 6);
        const newSerial = parsedToSerial(parsed1, undefined, 6);
        expect(newSerial).toEqual(originalSerial);
    });

    it.each(serials)('should parse a trailer for every serial %s', (originalSerial) => {
        const bytes = serialToBytes(originalSerial);
        const parsed = parse(bytes, 'varint', 6);
        expect(parsed.trailer_bits).toBeDefined();
    });
});

describe('parser', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should correctly detect element if present in serial %s', (originalSerial) => {
        const bytes = serialToBytes(originalSerial);
        const parsed = parse(bytes, 'varint', 6);

        const elementFlagIndex = utils.findBitPattern(bytes, utils.ELEMENT_FLAG_BITS);
        if (elementFlagIndex !== -1) {
            const elementStream = new Bitstream(bytes);
            elementStream.bit_pos = elementFlagIndex + utils.ELEMENT_FLAG_BITS.length;
            const elementPatternBits = elementStream.read(8);
            if (elementPatternBits !== null) {
                const elementPattern = elementPatternBits.toString(2).padStart(8, '0');
                const foundElement = Object.entries(utils.ELEMENTAL_PATTERNS_V2).find(([, p]) => p === elementPattern);
                if (foundElement) {
                    expect(parsed.element).toBeDefined();
                    expect(parsed.element.name).toBe(foundElement[0]);
                    expect(parsed.element.pattern.join('')).toBe(elementPattern);
                    expect(parsed.element.position).toBe(elementFlagIndex);
                } else {
                    expect(parsed.element).toBeUndefined();
                }
            } else {
                expect(parsed.element).toBeUndefined();
            }
        } else {
            expect(parsed.element).toBeUndefined();
        }
    });
});