import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';
import { ELEMENT_FLAG, ELEMENTAL_PATTERNS_V2 } from './utils';

describe('parser and encoder', () => {
    it('should parse and encode a serial with a v2 element, maintaining integrity', () => {
        const originalSerial = '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrL';
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
        const newSerial = parsedToSerial(parsed);
        expect(newSerial).toBe(originalSerial);
    });
});

describe('parser', () => {
    it('should parse a binary string with an element', () => {
        const element = 'CORR';
        const elementPattern = ELEMENTAL_PATTERNS_V2[element];
        const binary = '0101010101' + '0'.repeat(78) + '0101' + ELEMENT_FLAG + elementPattern;
        const parsed = parse(binary);
        expect(parsed.v2_element).toEqual(expect.objectContaining({
            element: element,
            pattern: elementPattern
        }));
    });

    it('should parse a binary string with an element and other chunks', () => {
        const element = 'CRYO';
        const elementPattern = ELEMENTAL_PATTERNS_V2[element];
        const chunk1 = '0101' + '0'.repeat(8);
        const chunk2 = '1010' + '0'.repeat(16);
        const binary = '0101010101' + '0'.repeat(78) + '0101' + chunk1 + ELEMENT_FLAG + elementPattern + chunk2;
        const parsed = parse(binary);
        expect(parsed.v2_element).toEqual(expect.objectContaining({
            element: element,
            pattern: elementPattern
        }));
        expect(parsed.chunks.length).toBe(2);
        expect(parsed.chunks[0].chunk_data.bits).toBe('0'.repeat(8));
        expect(parsed.chunks[1].chunk_data.bits).toBe('0'.repeat(16));
    });

    it('should correctly identify the element from a complex serial', () => {
        const serial = '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r @!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrL';
        const binary = serialToBinary(serial);
        const parsed = parse(binary);
        expect(parsed.v2_element.element).toBe('FIRE');
    });
});
