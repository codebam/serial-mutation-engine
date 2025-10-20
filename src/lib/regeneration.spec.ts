import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBytes } from './decode';
import { MANUFACTURER_PATTERNS, ELEMENTAL_PATTERNS_V2 } from './utils';
import * as fs from 'fs';

describe('serial regeneration', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should survive a round trip edit of all fields for serial %s', (originalSerial) => {
        const originalBytes = serialToBytes(originalSerial);
        const parsed = parse(originalBytes);

        // Modify Level
        if (parsed.level) {
            parsed.level.value = '25';
            parsed.level.bits = undefined;
        }

        // Modify Assets - add a new asset
        const originalAssetCount = parsed.assets.length;
        parsed.assets.push({ value: 63n, bitLength: 6, bits: [1, 1, 1, 1, 1, 1] });

        // Modify Element
        if (parsed.element) {
            const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
            const nextElement = elements[(elements.indexOf(parsed.element.name) + 1) % elements.length];
            parsed.element.name = nextElement;
            parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement].split('').map(Number);
        }

        const newSerial = parsedToSerial(parsed);
        const newBytes = serialToBytes(newSerial);
        const newParsed = parse(newBytes);

        if (parsed.level) {
            expect(newParsed.level.value).toBe(25);
        }

        if (parsed.element) {
            expect(newParsed.element).toBeDefined();
            expect(newParsed.element.name).toBe(parsed.element.name);
            expect(newParsed.element.pattern).toEqual(parsed.element.pattern);
        }
    });
});

describe('level modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);
    it.each(serials)('should survive a round trip edit of the level for serial %s', (originalSerial) => {
        const originalBytes = serialToBytes(originalSerial);
        const parsed = parse(originalBytes);

        if (!parsed.level) {
            return;
        }

        parsed.level.value = 2;
        parsed.level.bits = undefined;

        const newSerial = parsedToSerial(parsed);
        const newBytes = serialToBytes(newSerial);
        const newParsed = parse(newBytes);

        expect(newParsed.level.value).toBe(2);
    });
});

describe('element modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);
    it.each(serials)('should survive a round trip edit of the element for serial %s', (originalSerial) => {
        const originalBytes = serialToBytes(originalSerial);
        const parsed = parse(originalBytes);

        if (parsed.element) {
            const originalElementName = parsed.element.name;

            const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
            const nextElement = elements[(elements.indexOf(originalElementName) + 1) % elements.length];
            parsed.element.name = nextElement;
            parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement];

            const newSerial = parsedToSerial(parsed);
            const newBytes = serialToBytes(newSerial);
            const newParsed = parse(newBytes);

            expect(newParsed.element).toBeDefined();
            expect(newParsed.element.name).toBe(nextElement);
        } else {
            expect(parsed.element).toBeUndefined();
        }
    });
});

describe('asset modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);
    it.each(serials)('should survive a round trip edit of assets for serial %s', (originalSerial) => {
        const originalBytes = serialToBytes(originalSerial);
        const parsed = parse(originalBytes);
        
        const assets = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
        const originalAssetCount = assets.length;

        assets.push({ value: 63n });

        const newSerial = parsedToSerial(parsed);
        const newBytes = serialToBytes(newSerial);
        const newParsed = parse(newBytes);


        const newAssets = newParsed.isVarInt ? newParsed.assets : newParsed.assets_fixed;
        expect(newAssets.length).toBe(originalAssetCount + 1);
    });
});
