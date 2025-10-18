import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';

describe('parser and encoder', () => {
    it('should parse and encode a large serial, maintaining integrity', () => {
        const originalSerial = '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrL';
        const binary = serialToBinary(originalSerial);
        const parsed = parse(binary);
        const newSerial = parsedToSerial(parsed);
        expect(newSerial).toBe(originalSerial);
    });
});
