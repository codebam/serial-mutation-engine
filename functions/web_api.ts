import type { EventContext } from '@cloudflare/workers-types';
import { api } from '../src/lib/api';

// Define a type for the expected request body
interface ApiRequest {
  method: keyof typeof api | 'batch';
  params: unknown[];
}

interface BatchOperation {
    method: keyof typeof api;
    params: unknown[];
}

export async function onRequestPost(context: EventContext<any, any, any>): Promise<Response> {
  try {
    const { request } = context;
    // It's safer to assert the type after parsing, or handle potential errors
    const body: Partial<ApiRequest> = await request.json();

    if (!body.method || !Array.isArray(body.params)) {
      return new Response('Invalid request body, expected { method: "decode" | "encode" | "batch", params: any[] }', { status: 400 });
    }

    switch (body.method) {
      case 'decode': {
        if (typeof body.params[0] !== 'string') {
          return new Response('Invalid params for "decode", expected [string]', { status: 400 });
        }
        const result = await api.decode(body.params[0]);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      case 'encode': {
         if (typeof body.params[0] !== 'object' || body.params[0] === null) {
          return new Response('Invalid params for "encode", expected [object]', { status: 400 });
        }
        const result = await api.encode(body.params[0]);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      case 'batch': {
        const operations = body.params[0] as BatchOperation[];
        if (!Array.isArray(operations)) {
          return new Response('Invalid params for "batch", expected [[{method, params}]]', { status: 400 });
        }
  
        const promises = operations.map(op => {
          if (op.method === 'decode' && typeof op.params[0] === 'string') {
            return api.decode(op.params[0]);
          } else if (op.method === 'encode' && typeof op.params[0] === 'object' && op.params[0] !== null) {
            return api.encode(op.params[0]);
          } else {
            // Return a rejected promise for invalid operations
            return Promise.reject(new Error(`Invalid operation in batch: ${op.method} with params ${JSON.stringify(op.params)}`));
          }
        });
  
        try {
          const results = await Promise.all(promises);
          return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (batchError) {
            const errorMessage = batchError instanceof Error ? batchError.message : 'An error occurred during batch processing.';
            return new Response(errorMessage, { status: 400 });
        }
      }
      default:
        // This case handles methods that are not 'decode' or 'encode'
        return new Response(`Method "${body.method}" not found on API.`, { status: 404 });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
        return new Response('Invalid JSON in request body.', { status: 400 });
    }
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
