import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
    base85_to_deserialized, 
    deserialized_to_base85, 
    parseSerial, 
    encodeSerial 
} from '$lib/api';
import xxhash from 'xxhash-wasm';

const { h64 } = await xxhash();

interface Operation {
    content: any;
    action: 'decode' | 'encode';
    format?: 'JSON';
    debug?: boolean;
}

async function processOperation(op: Operation, cache?: KVNamespace): Promise<any> {
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
                if (cache) {
                    const hash = h64(op.content);
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

    try {
        const body = await request.json();

        if (Array.isArray(body)) {
            // Batch processing
            if (body.some(op => op.debug === true)) {
                debug = true;
            }
            const promises = body.map(op => processOperation(op, cache));
            const results = await Promise.all(promises);
            response = json(results);
        } else if (typeof body === 'object' && body !== null) {
            // Single operation
            if ((body as Operation).debug === true) {
                debug = true;
            }
            const result = await processOperation(body as Operation, cache);
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

export const GET: RequestHandler = async ({ url }) => {
    const helpMessage = `
# Serial Mutation Engine API Usage

This API allows you to decode and encode serial strings. All operations are performed via 
\`POST\` requests to \`https://serial-mutation-engine.pages.dev/api\`.

## Request Structure

You can send either a single operation object or an array of operation objects for batch processing.

Each operation object must contain:
- \`content\`: The data to be processed (string for decode, object/array for encode).
- \`action\`: Either "decode" or "encode".
- \`format\` (optional): If set to "JSON", \`parseSerial\` (for decode) or \`encodeSerial\` (for encode) will be used. Otherwise, \`base85_to_deserialized\` or \`deserialized_to_base85\` will be used.

---

## Examples

### 1. Single Operation (POST Request)

#### cURL Example

\`\`\`bash
# Decode (default format)
curl -X POST https://serial-mutation-engine.pages.dev/api \\
-H "Content-Type: application/json" \\
-d '{"content": "your-base85-string", "action": "decode"}'

# Encode (JSON format)
curl -X POST https://serial-mutation-engine.pages.dev/api \\
-H "Content-Type: application/json" \\
-d '{"content": {"some": "object"}, "action": "encode", "format": "JSON"}'
\`\`\`

#### Python Example

\`\`\`python
import requests
import json

api_url = "https://serial-mutation-engine.pages.dev/api"
headers = {"Content-Type": "application/json"}

# Decode (default format)
payload_decode_default = {"content": "your-base85-string", "action": "decode"}
response = requests.post(api_url, headers=headers, data=json.dumps(payload_decode_default))
print("Decode (default):", response.json())

# Encode (JSON format)
payload_encode_json = {"content": {"some": "object"}, "action": "encode", "format": "JSON"}
response = requests.post(api_url, headers=headers, data=json.dumps(payload_encode_json))
print("Encode (JSON):", response.json())
\`\`\`

#### JavaScript Example (Node.js or Browser)

\`\`\`javascript
const api_url = "https://serial-mutation-engine.pages.dev/api";

// Decode (default format)
async function decodeDefault() {
  const payload = { content: "your-base85-string", action: "decode" };
  const response = await fetch(api_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  console.log("Decode (default):", data);
}

// Encode (JSON format)
async function encodeJson() {
  const payload = { content: { some: "object" }, action: "encode", format: "JSON" };
  const response = await fetch(api_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  console.log("Encode (JSON):", data);
}

decodeDefault();
encodeJson();
\`\`\`

### 2. Batch Operations (POST Request with Array Body)

#### cURL Example

\`\`\`bash
curl -X POST https://serial-mutation-engine.pages.dev/api \
-H "Content-Type: application/json" \
-d 
'[
  {"content": "some-base85-string", "action": "decode"},
  {"content": {"some": "object"}, "action": "encode", "format": "JSON"},
  {"content": [1,2,3], "action": "encode"}
]'
\`\`\`

#### Python Example

\`\`\`python
import requests
import json

api_url = "https://serial-mutation-engine.pages.dev/api"
headers = {"Content-Type": "application/json"}

batch_payload = [
  {"content": "some-base85-string", "action": "decode"},
  {"content": {"some": "object"}, "action": "encode", "format": "JSON"},
  {"content": [1,2,3], "action": "encode"}
]

response = requests.post(api_url, headers=headers, data=json.dumps(batch_payload))
print("Batch Results:", response.json())
\`\`\`

#### JavaScript Example (Node.js or Browser)

\`\`\`javascript
const api_url = "https://serial-mutation-engine.pages.dev/api";

async function batchOperations() {
  const batch_payload = [
    { content: "some-base85-string", action: "decode" },
    { content: { some: "object" }, action: "encode", format: "JSON" },
    { content: [1,2,3], action: "encode" }
  ];

  const response = await fetch(api_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch_payload),
  });
  const data = await response.json();
  console.log("Batch Results:", data);
}

batchOperations();
\`\`\`
`;
    return new Response(helpMessage, {
        headers: {
            'Content-Type': 'text/markdown',
        },
    });
};
