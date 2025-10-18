import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { serialToBinary } from './decode';
import * as fs from 'fs';

describe('Assets', () => {
    const serials = fs.readFileSync('./serials.txt', 'utf-8').split('\n').filter(s => s.length > 0);

    it.each(serials)('serial %s should have assets', (serial) => {
        const binary = serialToBinary(serial);
        const parsed = parse(binary);
        expect(parsed.assets).toBeDefined();
    });
});