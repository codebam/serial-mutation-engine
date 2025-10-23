import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { api } from '$lib/api';

interface ApiRequest {
  method: keyof typeof api | 'batch';
  params: unknown[];
}

interface BatchOperation {
    method: keyof typeof api;
    params: unknown[];
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: Partial<ApiRequest> = await request.json();

    if (!body.method || !Array.isArray(body.params)) {
      return json({ error: 'Invalid request body, expected { method: "decode" | "encode" | "batch", params: any[] }' }, { status: 400 });
    }

    switch (body.method) {
      case 'decode': {
        if (typeof body.params[0] !== 'string') {
          return json({ error: 'Invalid params for "decode", expected [string]' }, { status: 400 });
        }
        const result = await api.decode(body.params[0]);
        return json(result);
      }
      case 'encode': {
         if (typeof body.params[0] !== 'object' || body.params[0] === null) {
          return json({ error: 'Invalid params for "encode", expected [object]' }, { status: 400 });
        }
        const result = await api.encode(body.params[0]);
        return json(result);
      }
      case 'batch': {
        const operations = body.params[0] as BatchOperation[];
        if (!Array.isArray(operations)) {
          return json({ error: 'Invalid params for "batch", expected [[{method, params}]]' }, { status: 400 });
        }
  
        const promises = operations.map(op => {
          if (op.method === 'decode' && typeof op.params[0] === 'string') {
            return api.decode(op.params[0]);
          } else if (op.method === 'encode' && typeof op.params[0] === 'object' && op.params[0] !== null) {
            return api.encode(op.params[0]);
          } else {
            return Promise.reject(new Error(`Invalid operation in batch: ${op.method} with params ${JSON.stringify(op.params)}`));
          }
        });
  
        try {
          const results = await Promise.all(promises);
          return json(results);
        } catch (batchError) {
            const errorMessage = batchError instanceof Error ? batchError.message : 'An error occurred during batch processing.';
            return json({ error: errorMessage }, { status: 400 });
        }
      }
      default:
        return json({ error: `Method "${body.method}" not found on API.` }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
        return json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return json({ error: errorMessage }, { status: 500 });
  }
};
