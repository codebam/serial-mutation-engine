import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { parsedToSerial } from './encoder';
import { serialToBinary } from './decode';

describe('parser', () => {
    it('should correctly classify a TYPE B serial', () => {
        const serial = '@Ugydj=2}TYg93=h!/NsC0/NqcERG/))s74JLN`oqi8i/^T3WExT3WGX_8i/^T8i/^T8i/^T8i/^T%7seQEmTU>NK{Ew7}OoqA5<t*E>t^Iq7s!0^#>IPl @4_abqjS1bqjS1bqjS1bqjS1bqjS1bqjUW11)M%i(1s87PY8FE$UE*I';
        const binary = serialToBinary(serial);
        const parsed = parse(binary);
        expect(parsed.serial_type).toBe('TYPE B');
    });
});