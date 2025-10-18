import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';

describe('parser and encoder', () => {
    it('should parse and encode a serial, maintaining integrity', () => {
        const originalSerial = '@Ug!pHG2__CA%-;ighq}}VgX){wV^ARtDz8D^IjFh^RXZ9KIRF';
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
        const newSerial = parsedToSerial(parsed);
        expect(newSerial).toBe(originalSerial);
    });

    it('should parse the assets correctly', () => {
        const originalSerial = '@Ug!pHG2__CA%-;ighq}}VgX){wV^ARtDz8D^IjFh^RXZ9KIRF';
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
        const expectedAssets = [ 44, 20, 78, 0 ];
        expect(parsed.assets).toEqual(expectedAssets);
    });

    it('should allow modifying the manufacturer', () => {
        const originalSerial = '@Ug!pHG2__CA%-;ighq}}VgX){wV^ARtDz8D^IjFh^RXZ9KIRF';
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);

        // Modify the manufacturer
        parsed.manufacturer.name = 'Maliwan';
        parsed.manufacturer.pattern = '2127'; // A known Maliwan pattern

        const newSerial = parsedToSerial(parsed);
        const newParsed = parse(serialToBinary(newSerial));

        expect(newParsed.manufacturer.name).toBe('Maliwan');
    });
});