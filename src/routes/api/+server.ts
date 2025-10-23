import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
    base85_to_deserialized, 
    deserialized_to_base85, 
    parseSerial, 
    encodeSerial 
} from '$lib/api';

interface Operation {
    content: any;
    action: 'decode' | 'encode';
    format?: 'JSON';
    debug?: boolean;
    cache?: boolean;
}

async function processOperation(op: Operation, cache: KVNamespace | undefined, sha256: ((message: string) => Promise<string>) | undefined): Promise<any> {
    if (!op.action || op.content === undefined) {
        throw new Error('Each operation must include "action" and "content" fields.');
    }

    if (op.format === 'JSON') {
        switch (op.action) {
            case 'decode':
                return parseSerial(op.content);
            case 'encode':
                return encodeSerial(op.content);
            default:
                throw new Error(`Invalid action for format JSON: ${op.action}`);
        }
    } else {
        switch (op.action) {
            case 'decode':
                if (op.cache && cache && sha256) {
                    const hash = await sha256(op.content);
                    const cached = await cache.get(hash);
                    if (cached) {
                        return JSON.parse(cached);
                    }
                    const result = base85_to_deserialized(op.content);
                    await cache.put(hash, JSON.stringify(result));
                    return result;
                }
                return base85_to_deserialized(op.content);
            case 'encode':
                return deserialized_to_base85(op.content);
            default:
                throw new Error(`Invalid action: ${op.action}`);
        }
    }
}

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
            if (body.some(op => op.debug === true)) {
                debug = true;
            }
            if (cache && body.some(op => op.cache === true)) {
                const { sha256: sha256Func } = await import('$lib/crypto');
                sha256 = sha256Func;
            }
            const promises = body.map(op => processOperation(op, cache, sha256));
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
        const status = (errorMessage.startsWith('Invalid') || errorMessage.startsWith('Each')) ? 400 : 500;
        response = json({ error: errorMessage }, { status });
    }

    if (debug) {
        const durationMs = performance.now() - start;
        response.headers.set('X-Execution-Time', `${durationMs.toFixed(10)}ms`);
    }

    return response;
};
