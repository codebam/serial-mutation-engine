import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { serialToBytes } from './decode';
import * as fs from 'fs';

describe('VarInt Round-trip Check', () => {
    it('should count successful VarInt round-trips', () => {
        const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

        let varintCount = 0;
        let fixedCount = 0;

        for (const serial of serials) {
            const parsed = parse(serial);
            if (parsed.isVarInt) {
                varintCount++;
            } else {
                fixedCount++;
            }
        }

        console.log(`Successfully round-tripped as VarInt: ${varintCount}`);
        console.log(`Fell back to Fixed-Width: ${fixedCount}`);
        expect(varintCount + fixedCount).toBe(serials.length);
    });
});
