import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { serialToBytes } from './decode';
import * as fs from 'fs';

describe('VarInt check', () => {
    it('should count VarInt and Fixed-Width serials', () => {
        const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

        let varintCount = 0;
        let fixedCount = 0;

        for (const serial of serials) {
            const bytes = serialToBytes(serial);
            const parsed = parse(bytes);
            if (parsed.isVarInt) {
                varintCount++;
            } else {
                fixedCount++;
            }
        }

        console.log(`VarInt: ${varintCount}`);
        console.log(`Fixed-Width: ${fixedCount}`);
    });
});
