import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';
import { MANUFACTURER_PATTERNS, ELEMENTAL_PATTERNS_V2 } from './utils';
import * as fs from 'fs';

describe('serial regeneration', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should survive a round trip edit of all fields for serial %s', (originalSerial) => {
        const originalBinary = serialToBinary(originalSerial);
        const parsed = parse(originalBinary);

        // Modify Level
        if (parsed.level) {
            parsed.level.value = '25';
        }

        // Modify Assets - add a new asset
        const originalAssetCount = parsed.assets.length;
        parsed.assets.push('111111');

        // Modify Element
        if (parsed.element) {
            const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
            const nextElement = elements[(elements.indexOf(parsed.element.name) + 1) % elements.length];
            parsed.element.name = nextElement;
            parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement];
        }

        const lengthDifference = (parsed.assets.length - originalAssetCount) * 6;
        const assetsStartPosition = parsed.preamble.length;

        if (parsed.level && parsed.level.position > assetsStartPosition) {
            parsed.level.position += lengthDifference;
        }
        if (parsed.manufacturer && parsed.manufacturer.position > assetsStartPosition) {
            parsed.manufacturer.position += lengthDifference;
        }
        if (parsed.element && parsed.element.position > assetsStartPosition) {
            parsed.element.position += lengthDifference;
        }

        const newSerial = parsedToSerial(parsed);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        if (parsed.level) {
            expect(newParsed.level.value).toBe(25);
        }

        expect(newParsed.assets.length).toBe(originalAssetCount + 1);
        expect(newParsed.assets.includes('111111')).toBe(true);

        if (parsed.element) {
            expect(newParsed.element).toBeDefined();
            expect(newParsed.element.name).toBe(parsed.element.name);
            expect(newParsed.element.pattern).toBe(parsed.element.pattern);
        }
    });
});
