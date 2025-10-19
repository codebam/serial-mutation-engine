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

        const newSerial = parsedToSerial(parsed);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        if (parsed.level) {
            expect(newParsed.level.value).toBe(25);
        }

        if (parsed.element) {
            expect(newParsed.element).toBeDefined();
            expect(newParsed.element.name).toBe(parsed.element.name);
            expect(newParsed.element.pattern).toBe(parsed.element.pattern);
        }
    });
});

describe('level modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0).slice(0, 5);
    it.each(serials)('should survive a round trip edit of the level for serial %s', (originalSerial) => {
        const originalBinary = serialToBinary(originalSerial);
        const parsed = parse(originalBinary);

        if (!parsed.level) {
            return;
        }

        parsed.level.value = 2;

        const newSerial = parsedToSerial(parsed);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        expect(newParsed.level.value).toBe(2);
    });
});

describe('element modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0).slice(0, 5);
    it.each(serials)('should survive a round trip edit of the element for serial %s', (originalSerial) => {
        const originalBinary = serialToBinary(originalSerial);
        const parsed = parse(originalBinary);

        if (!parsed.element) {
            return;
        }
        
        const originalElementName = parsed.element.name;

        const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
        const nextElement = elements[(elements.indexOf(originalElementName) + 1) % elements.length];
        parsed.element.name = nextElement;
        parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement];

        const newSerial = parsedToSerial(parsed);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        expect(newParsed.element).toBeDefined();
        expect(newParsed.element.name).toBe(nextElement);
    });
});

describe('asset modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0).slice(0, 5);
    it.each(serials)('should survive a round trip edit of assets for serial %s', (originalSerial) => {
        const originalBinary = serialToBinary(originalSerial);
        const parsed = parse(originalBinary);
        
        const originalAssetCount = parsed.assets.length;

        parsed.assets.push('111111');

        const newSerial = parsedToSerial(parsed);
        const newBinary = serialToBinary(newSerial);
        const newParsed = parse(newBinary);

        expect(newParsed.assets.length).toBe(originalAssetCount + 1);
    });
});
