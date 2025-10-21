import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { serialToBytes } from './decode';
import * as fs from 'fs';

describe('Assets', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('serial %s should have assets', (serial) => {
        const bytes = serialToBytes(serial);
        const parsed = parse(bytes, 'varint', 6);
        expect(parsed.assets).toBeDefined();
    });
});