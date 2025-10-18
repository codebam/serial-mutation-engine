import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial, updateParsed } from './encoder';
import { serialToBinary } from './decode';
import { MANUFACTURER_PATTERNS } from './utils';
import * as fs from 'fs';

describe('swapping manufacturer and level', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should swap manufacturer and level for serial %s', (originalSerial) => {
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);

        // Swap manufacturer
        const originalManufacturer = parsed.manufacturer.name;
        const manufacturers = Object.keys(MANUFACTURER_PATTERNS);
        const nextManufacturer = manufacturers[(manufacturers.indexOf(originalManufacturer) + 1) % manufacturers.length];

        // Swap level
        const originalLevel = parsed.level.value;
        const newLevel = (originalLevel % 50) + 1; // a new level between 1 and 50

        const newParsed = updateParsed(parsed, { manufacturer: nextManufacturer, level: newLevel });
        const newSerial = parsedToSerial(newParsed);
        const newBinary = serialToBinary(newSerial);
        const finalParsed = parse(newBinary);

        expect(finalParsed.manufacturer.name).toBe(nextManufacturer);
        expect(finalParsed.level.value).toBe(newLevel);
    });
});
