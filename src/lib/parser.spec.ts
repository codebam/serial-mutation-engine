
import { describe, it, expect } from 'vitest';
import { parseSerial } from './parser';
import { encodeSerial } from './encoder';

describe('parser and encoder roundtrip', () => {
    const serials = [
        '@Ug!pHG2__CA%$*B*hq}}VgZg1mAq^^LDp%^iLG?SR+R>og0R',
        '@Uga`vnFme!K<Ude5RG}7is6q8Z{X=bP4k{M{',
        '@Uga`vnFme!KGCxo/RG}7?s6!2EQ*%(c5C',
        '@Uga`vnFme!KJYP^dRG}6%sD7w_s7=j5<w5`',
    ];

    serials.forEach((serial, index) => {
        it(`should correctly parse and encode serial #${index + 1}`, () => {
            const parsed = parseSerial(serial);
            const encoded = encodeSerial(parsed);
            expect(encoded).toBe(serial);
        });
    });
});
