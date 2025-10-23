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
}

async function processOperation(op: Operation): Promise<any> {
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
                return base85_to_deserialized(op.content);
            case 'encode':
                return deserialized_to_base85(op.content);
            default:
                throw new Error(`Invalid action: ${op.action}`);
        }
    }
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();

        if (Array.isArray(body)) {
            // Batch processing
            const promises = body.map(op => processOperation(op));
            const results = await Promise.all(promises);
            return json(results);
        } else if (typeof body === 'object' && body !== null) {
            // Single operation
            const result = await processOperation(body as Operation);
            return json(result);
        } else {
            return json({ error: 'Invalid request body. Expecting an object or an array of objects.' }, { status: 400 });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        // Distinguish between user error (e.g., bad input) and server error
        if (errorMessage.startsWith('Invalid') || errorMessage.startsWith('Each')) {
            return json({ error: errorMessage }, { status: 400 });
        }
        console.error(error);
        return json({ error: errorMessage }, { status: 500 });
    }
};