import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	base85_to_deserialized,
	deserialized_to_base85,
	parseSerial,
	encodeSerial
} from '$lib/api';
import type { Serial } from '$lib/types';

interface Operation {
	content: string | object;
	action: 'decode' | 'encode';
	format?: 'JSON';
	debug?: boolean;
	cache?: boolean;
}

async function processOperation(
	op: Operation,
	cache: KVNamespace | undefined,
	sha256: ((message: string) => Promise<string>) | undefined
): Promise<unknown> {
	if (!op.action || op.content === undefined) {
		throw new Error('Each operation must include "action" and "content" fields.');
	}

	if (op.format === 'JSON') {
		switch (op.action) {
			case 'decode':
				return parseSerial(op.content as string);
			case 'encode':
				return encodeSerial(op.content as Serial);
			default:
				throw new Error(`Invalid action for format JSON: ${op.action}`);
		}
	} else {
		switch (op.action) {
			case 'decode':
				if (op.cache && cache && sha256) {
					const hash = await sha256(op.content as string);
					const cached = await cache.get(hash);
					if (cached) {
						return JSON.parse(cached);
					}
					const result = base85_to_deserialized(op.content as string);
					await cache.put(hash, JSON.stringify(result));
					return result;
				}
				return base85_to_deserialized(op.content as string);
			case 'encode':
				return deserialized_to_base85(op.content as string);
			default:
				throw new Error(`Invalid action: ${op.action}`);
		}
	}
}

/**
 * @typedef {object} Operation
 * @property {string | object} content - The content to process.
 * @property {'decode' | 'encode'} action - The action to perform.
 * @property {'JSON'} [format] - The format of the content.
 * @property {boolean} [debug] - Enable debug mode to get execution time.
 * @property {boolean} [cache] - Enable caching for decode operations.
 */

/**
 * Handles POST requests to process serials.
 * @route POST /api
 * @param {Request} request - The incoming request object.
 * @body {Operation | Operation[]} - A single operation or an array of operations.
 * @returns {Response<object|object[]>} The result of the operation(s).
 * @throws {400} If the request body is invalid.
 * @throws {500} If an unexpected error occurs.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const start = performance.now(); // Use high-resolution timer
	let response: Response;
	let debug = false;
	const cache = platform?.env?.SERIAL_CACHE;
	let sha256: ((message: string) => Promise<string>) | undefined;

	try {
		const body = await request.json();

		if (Array.isArray(body)) {
			// Batch processing
			if (body.some((op) => op.debug === true)) {
				debug = true;
			}
			if (cache && body.some((op) => op.cache === true)) {
				const { sha256: sha256Func } = await import('$lib/crypto');
				sha256 = sha256Func;
			}
			const promises = body.map((op) => processOperation(op, cache, sha256));
			const results = await Promise.all(promises);
			response = json(results);
		} else if (typeof body === 'object' && body !== null) {
			// Single operation
			if ((body as Operation).debug === true) {
				debug = true;
			}
			if (cache && (body as Operation).cache === true) {
				const { sha256: sha256Func } = await import('$lib/crypto');
				sha256 = sha256Func;
			}
			const result = await processOperation(body as Operation, cache, sha256);
			response = json(result);
		} else {
			throw new Error('Invalid request body. Expecting an object or an array of objects.');
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
		const status =
			errorMessage.startsWith('Invalid') || errorMessage.startsWith('Each') ? 400 : 500;
		response = json({ error: errorMessage }, { status });
	}

	if (debug) {
		const durationMs = performance.now() - start;
		response.headers.set('X-Execution-Time', `${durationMs.toFixed(10)}ms`);
	}

	return response;
};
