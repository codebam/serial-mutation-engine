import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.ts';
import * as api from '$lib/api.ts';
import { operationSchema, batchOperationSchema } from '$lib/schemas.ts';

/**
 * @typedef {object} Operation
 * @property {string} functionName - The name of the function to call from the API.
 * @property {any[]} args - An array of arguments to pass to the function.
 * @property {boolean} [debug] - Enable debug mode to get execution time.
 * @property {boolean} [cache] - Enable caching for decode operations.
 */
interface Operation {
	functionName: string;
	args: unknown[];
	debug?: boolean;
	cache?: boolean;
}

async function processOperation(
	op: Operation,
): Promise<unknown> {
	const { functionName, args } = op;
	const apiFunction = (api as unknown as Record<string, (...args: unknown[]) => unknown>)[
		functionName
	];
	if (typeof apiFunction !== 'function') {
		throw new Error(`'${functionName}' is not a valid API function.`);
	}
	return await apiFunction(...args);
}

/**
 * Handles POST requests to process serials.
 * @route POST /api
 * @param {Request} request - The incoming request object.
 * @body {Operation | Operation[]} - A single operation or an array of operations.
 * @returns {Response<object|object[]>} The result of the operation(s).
 * @throws {400} If the request body is invalid.
 * @throws {500} If an unexpected error occurs.
 * @example
 * // Single operation
 * {
 *   "functionName": "parseSerial",
 *   "args": ["@UgbV{rFme!KI4sa#RG}W#sX3@xsFnx"]
 * }
 *
 * @example
 * // Batch of operations
 * [
 *   {
 *     "functionName": "parseSerial",
 *     "args": ["@UgbV{rFme!KI4sa#RG}W#sX3@xsFnx"]
 *   },
 *   {
 *     "functionName": "encodeSerial",
 *     "args": [[{ "token": 4, "value": 1 }]]
 *   }
 * ]
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
			const validationResult = batchOperationSchema.safeParse(body);
			if (!validationResult.success) {
				return json({ error: validationResult.error.flatten() }, { status: 400 });
			}
			if (body.some((op) => op.debug === true)) {
				debug = true;
			}
			if (cache && body.some((op) => op.cache === true)) {
				const { sha256: sha256Func } = await import('$lib/crypto');
				sha256 = sha256Func;
			}
			const promises = body.map((op) => processOperation(op));
			const results = await Promise.all(promises);
			response = json(results);
		} else if (typeof body === 'object' && body !== null) {
			// Single operation
			const validationResult = operationSchema.safeParse(body);
			if (!validationResult.success) {
				return json({ error: validationResult.error.flatten() }, { status: 400 });
			}
			if ((body as Operation).debug === true) {
				debug = true;
			}
			if (cache && (body as Operation).cache === true) {
				const { sha256: sha256Func } = await import('$lib/crypto');
				sha256 = sha256Func;
			}
			const result = await processOperation(body as Operation);
			response = json(result);
		} else {
			throw new Error('Invalid request body. Expecting an object or an array of objects.');
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
		console.error('API Error:', error);
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
