import { describe, it, expect } from 'vitest';
import { base85_to_deserialized, deserialized_to_base85 } from './api';
import * as fs from 'fs';
import * as path from 'path';

describe('roundtrip', () => {
  it('should roundtrip all but 37 serials', () => {
    const serials_path = path.join(__dirname, '../../serials.txt');
    const serials_text = fs.readFileSync(serials_path, 'utf-8');
    const serials = serials_text.split('\n').filter(s => s.length > 0);

    let failed_count = 0;
    const failed_serials: string[] = [];

    for (const serial of serials) {
      try {
        const deserialized = base85_to_deserialized(serial);
        const new_serial = deserialized_to_base85(deserialized);

        if (serial !== new_serial) {
          failed_count++;
          failed_serials.push(`Mismatch: Original: ${serial}, New: ${new_serial}`);
        }
      } catch (e: any) {
        failed_count++;
        failed_serials.push(`Exception for ${serial}: ${e.message}`);
      }
    }

    console.log(`Failed to roundtrip ${failed_count} serials`);
    console.log(failed_serials);

    expect(failed_count).toBe(37);
  });
});
