import { describe, it, expect } from 'vitest';
import { base85_to_deserialized, deserialized_to_base85, parseCustomFormat } from './custom_parser';
import { parseSerial } from './parser';
import { encodeSerial } from './encoder';
import * as fs from 'fs';
import * as path from 'path';

describe('roundtrip', () => {
	it('should roundtrip all serials', async () => {
		const serials_path = path.join(__dirname, '../../serials.txt');
		const serials_text = fs.readFileSync(serials_path, 'utf-8');
		const serials = serials_text.split('\n').filter((s) => s.length > 0);

		let failed_count = 0;
		const failed_serials: string[] = [];

		for (const serial of serials) {
			try {
				const deserialized = await base85_to_deserialized(serial);
				const new_serial = await deserialized_to_base85(deserialized);

				const parsed_serial_object = await parseSerial(serial);
				const encoded_from_parsed = await encodeSerial(parsed_serial_object);

				if (serial !== new_serial) {
					failed_count++;
					if (failed_count < 10) {
						console.log({
							title: 'custom format roundtrip',
							serial,
							new_serial
						});
					}
					const original_parsed = await parseSerial(serial);
					const new_parsed = await parseCustomFormat(deserialized);
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
					if (failed_count < 10) {
						console.log({
							title: 'direct encodeSerial',
							serial,
							encoded_from_parsed
						});
					}
					const original_parsed = await parseSerial(serial);
					const new_parsed = await parseSerial(encoded_from_parsed);
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

	// it('should encode passive names and identifiers to the same serial and deserialize to a normalized format', () => {
	// 	const customFormatWithName = '256, 0, 1, 50| 2, 4285|| {26} {10} {53} "passive_blue_2_5_tier_4" "passive_blue_1_2_tier_3" "passive_green_2_3_tier_2" "Cast Iron::passive_green_1_1_tier_1"|';
	// 	const customFormatWithoutName = '256, 0, 1, 50| 2, 4285|| {26} {10} {53} "passive_blue_2_5_tier_4" "passive_blue_1_2_tier_3" "passive_green_2_3_tier_2" "passive_green_1_1_tier_1"|';
	// 	const expectedNormalizedFormat = '256, 0, 1, 50| 2, 4285|| {26} {10} {53} "passive_blue_2_5_tier_4" "passive_blue_1_2_tier_3" "passive_green_2_3_tier_2" "passive_green_1_1_tier_1"|';

	// 	const serial1 = deserialized_to_base85(customFormatWithName);
	// 	const serial2 = deserialized_to_base85(customFormatWithoutName);

	// 	expect(serial1).toEqual(serial2);

	// 	const deserialized1 = base85_to_deserialized(serial1);
	// 	const deserialized2 = base85_to_deserialized(serial2);

	// 	expect(deserialized1).toEqual(expectedNormalizedFormat);
	// 	expect(deserialized2).toEqual(expectedNormalizedFormat);
	// });
});
