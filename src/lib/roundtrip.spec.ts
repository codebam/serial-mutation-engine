import { describe, it, expect } from 'vitest';
import { base85_to_deserialized, deserialized_to_base85, parseCustomFormat } from './custom_parser';
import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import * as fs from 'fs';
import * as path from 'path';

describe('roundtrip', () => {
	it('should roundtrip all serials', () => {
		const serials_path = path.join(__dirname, '../../serials.txt');
		const serials_text = fs.readFileSync(serials_path, 'utf-8');
		const serials = serials_text.split('\n').filter((s) => s.length > 0);

		let failed_count = 0;
		const failed_serials: string[] = [];

		for (const serial of serials) {
			try {
				const deserialized = base85_to_deserialized(serial);
				const new_serial = deserialized_to_base85(deserialized);

				const parsed_serial_object = parseSerial(serial);
				const encoded_from_parsed = encodeSerial(parsed_serial_object);

				if (serial !== new_serial) {
					failed_count++;
					const original_parsed = parseSerial(serial);
					const new_parsed = parseCustomFormat(deserialized);
					if (JSON.stringify(original_parsed) !== JSON.stringify(new_parsed)) {
						failed_serials.push(
							`Mismatch for ${serial} (custom format roundtrip):\nOriginal parsed: ${JSON.stringify(original_parsed)}\nNew parsed: ${JSON.stringify(new_parsed)}`
						);
					} else {
						failed_serials.push(`Encoding mismatch for ${serial} (custom format roundtrip)`);
					}
				}

				if (serial !== encoded_from_parsed) {
					failed_count++;
					const original_parsed = parseSerial(serial);
					const new_parsed = parseSerial(encoded_from_parsed);
					if (JSON.stringify(original_parsed) !== JSON.stringify(new_parsed)) {
						failed_serials.push(
							`Mismatch for ${serial} (direct encodeSerial):\nOriginal parsed: ${JSON.stringify(original_parsed)}\nNew parsed: ${JSON.stringify(new_parsed)}`
						);
					} else {
						failed_serials.push(`Encoding mismatch for ${serial} (direct encodeSerial)`);
					}
				}
			} catch (e) {
				failed_count++;
				failed_serials.push(`Exception for ${serial}: ${(e as Error).message}`);
			}
		}

		expect(failed_count).toBe(0);
	});
});
