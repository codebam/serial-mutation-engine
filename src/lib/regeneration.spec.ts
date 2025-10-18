import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { regenerateSerial } from './regenerate';
import { serialToBinary } from './decode';
import { MANUFACTURER_PATTERNS } from './utils';
import * as fs from 'fs';

describe('serial regeneration', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should regenerate serial %s with a new manufacturer and level', (originalSerial) => {
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);

        const newSerialUnchanged = regenerateSerial(parsed, binary);
        expect(newSerialUnchanged).toBe(originalSerial);

        // Swap manufacturer
        const originalManufacturer = parsed.manufacturer.name;
        const manufacturers = Object.keys(MANUFACTURER_PATTERNS);
        const nextManufacturer = manufacturers[(manufacturers.indexOf(originalManufacturer) + 1) % manufacturers.length];
        parsed.manufacturer.name = nextManufacturer;
        parsed.manufacturer.pattern = MANUFACTURER_PATTERNS[nextManufacturer][0];

        const newSerial = regenerateSerial(parsed, binary);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        expect(newParsed.manufacturer.name).toBe(nextManufacturer);
    });
});
