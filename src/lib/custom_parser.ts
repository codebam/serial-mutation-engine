import { parseSerial } from './parser.ts';
import { encodeSerial } from './encoder.ts';
import { toCustomFormat } from './formatter.ts';
import { parseCustomFormat } from './custom_format_parser.ts';

/**
 * @name serialToCustomFormat
 * @description Converts a Base85 encoded serial string to a human-readable custom format.
 * @param {string} serial - The Base85 encoded serial string.
 * @returns {Promise<string>} A promise that resolves to the deserialized custom format string.
 */
export async function serialToCustomFormat(serial: string): Promise<string> {
	const parsed = await parseSerial(serial);
	return toCustomFormat(parsed, true);
}
/**
 * @name customFormatToSerial
 * @description Converts a human-readable custom format string to a Base85 encoded serial string.
 * @param {string} custom - The custom format string.
 * @param {Record<string, { id: number; name?: string }>} [passives] - Optional map of passive names to their IDs.
 * @returns {Promise<string>} A promise that resolves to the Base85 encoded serial string.
 */
export async function customFormatToSerial(
	custom: string,
	passives?: Record<string, { id: number; name?: string }>
): Promise<string> {
	const parsed = await parseCustomFormat(custom, passives);
	return await encodeSerial(parsed);
}
