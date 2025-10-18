import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2 } from './utils';

describe('parser', () => {
    it('should parse a binary string with an element', () => {
        const element = 'CORR';
        const elementPattern = ELEMENTAL_PATTERNS_V2[element];
        const binary = '0101010101' + '0'.repeat(78) + '0101' + ELEMENT_FLAG + elementPattern;
        const parsed = parse(binary);
        expect(parsed.v2_element).toEqual({
            element: element,
            pattern: elementPattern
        });
    });

    it('should parse a binary string with an element and other chunks', () => {
        const element = 'CRYO';
        const elementPattern = ELEMENTAL_PATTERNS_V2[element];
        const chunk1 = '0101' + '0'.repeat(8);
        const chunk2 = '1010' + '0'.repeat(16);
        const binary = '0101010101' + '0'.repeat(78) + '0101' + chunk1 + ELEMENT_FLAG + elementPattern + chunk2;
        const parsed = parse(binary);
        expect(parsed.v2_element).toEqual({
            element: element,
            pattern: elementPattern
        });
        expect(parsed.chunks.length).toBe(2);
    });
});
