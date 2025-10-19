import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';
import * as fs from 'fs';
import { ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2 } from './utils';

describe('parser and encoder', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should parse and encode serial %s, maintaining integrity', (originalSerial) => {
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
                const newSerial = parsedToSerial(parsed);
                expect(newSerial).toBe(originalSerial);
            });
        
            it.each(serials)('should parse a trailer for every serial %s', (originalSerial) => {
                const binary = serialToBinary(originalSerial);
                const parsed = parse(binary);
                expect(typeof parsed.trailer).toBe('string');
            });
        });

describe('parser', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should correctly detect element if present in serial %s', (originalSerial) => {
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);

        const elementFlagIndex = binary.indexOf(ELEMENT_FLAG);
        if (elementFlagIndex !== -1) {
            const elementPattern = binary.substring(elementFlagIndex + ELEMENT_FLAG.length, elementFlagIndex + ELEMENT_FLAG.length + 8);
            const foundElement = Object.entries(ELEMENTAL_PATTERNS_V2).find(([, p]) => p === elementPattern);
            if (foundElement) {
                expect(parsed.element).toBeDefined();
                expect(parsed.element.name).toBe(foundElement[0]);
                expect(parsed.element.pattern).toBe(elementPattern);
                expect(parsed.element.position).toBe(elementFlagIndex);
            } else {
                expect(parsed.element).toBeUndefined();
            }
        } else {
            expect(parsed.element).toBeUndefined();
        }
    });
});