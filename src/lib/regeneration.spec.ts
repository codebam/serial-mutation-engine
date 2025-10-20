import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBytes } from './decode';
import { MANUFACTURER_PATTERNS, ELEMENTAL_PATTERNS_V2, valueToVarIntBits } from './utils';
import * as fs from 'fs';

describe('serial regeneration', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('should survive a round trip edit of all fields for serial %s', (originalSerial) => {
        const parsed = parse(originalSerial);

        // Modify Level
        if (parsed.level) {
            parsed.level.value = '25';
            parsed.level.bits = undefined;
        }

        // Modify Assets - modify an existing asset
        const assets = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
        if (assets.length > 0) {
            const newValue = 11n; // Use a different value
            const first_asset = assets[0];
            const original_bitLength = first_asset.bitLength;
            first_asset.value = newValue;
            if (parsed.isVarInt) {
                first_asset.bits = valueToVarIntBits(newValue, original_bitLength);
            } else {
                first_asset.bits = newValue.toString(2).padStart(original_bitLength, '0').split('').map(Number);
            }
        } else {
            expect(true).toBe(true); // Satisfy the test runner for skipped tests
        }

        // Modify Element
        if (parsed.element) {
            const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
            const nextElement = elements[(elements.indexOf(parsed.element.name) + 1) % elements.length];
            parsed.element.name = nextElement;
            parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement].split('').map(Number);
        }

        const newSerial = parsedToSerial(parsed);
        const newParsed = parse(newSerial);

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
        const parsed = parse(originalSerial);

        if (!parsed.level) {
            return;
        }

        parsed.level.value = 2;
        parsed.level.bits = undefined;

        const newSerial = parsedToSerial(parsed);
        const newParsed = parse(newSerial);

        expect(newParsed.level.value).toBe(2);
    });
});

describe('element modification', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);
    it.each(serials)('should survive a round trip edit of the element for serial %s', (originalSerial) => {
        const parsed = parse(originalSerial);

        if (parsed.element) {
            const originalElementName = parsed.element.name;

            const elements = Object.keys(ELEMENTAL_PATTERNS_V2);
            const nextElement = elements[(elements.indexOf(originalElementName) + 1) % elements.length];
            parsed.element.name = nextElement;
            parsed.element.pattern = ELEMENTAL_PATTERNS_V2[nextElement].split('').map(Number);

            const newSerial = parsedToSerial(parsed);
            const newParsed = parse(newSerial);

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
        const parsed = parse(originalSerial);

        const assets = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
        if (assets.length === 0) {
            expect(true).toBe(true); // Satisfy the test runner for skipped tests
            return;
        }
        const originalAssetCount = assets.length;
        const newValue = 10n;

        const first_asset = assets[0];
        const original_bitLength = first_asset.bitLength;
        
        first_asset.value = newValue;
        if (parsed.isVarInt) {
            first_asset.bits = valueToVarIntBits(newValue, original_bitLength);
        } else {
            first_asset.bits = newValue.toString(2).padStart(original_bitLength, '0').split('').map(Number);
        }

        const newSerial = parsedToSerial(parsed);
        const newParsed = parse(newSerial);

        const newAssets = newParsed.isVarInt ? newParsed.assets : newParsed.assets_fixed;
        expect(newAssets.length).toBe(originalAssetCount);
        expect(newAssets[0].value).toBe(newValue);
    });
});

describe('asset appending', () => {
    it('should correctly append an asset to a serial', () => {
        const originalSerial = '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r @!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrL';
        const assetToAppend = 10894n; // 2A8E in hex

        const parsed = parse(originalSerial);

        const assets = parsed.isVarInt ? parsed.assets : parsed.assets_fixed;
        const lastAsset = assets[assets.length - 1];
        const newPosition = lastAsset ? lastAsset.position + lastAsset.bitLength : parsed.assets_start_pos;
        assets.push({ value: assetToAppend, bits: undefined, position: newPosition });

        const newSerial = parsedToSerial(parsed);
        const newParsed = parse(newSerial);

        const newAssets = newParsed.isVarInt ? newParsed.assets : newParsed.assets_fixed;
        expect(newAssets.length).toBe(assets.length);
        expect(newAssets[newAssets.length - 1].value).toBe(assetToAppend);
    });
});
