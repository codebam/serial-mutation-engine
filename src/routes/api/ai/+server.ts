
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial } = await request.json();

  if (!deserialized_serial) {
    return json({ error: 'Missing deserialized_serial' }, { status: 400 });
  }

  const prompt = `please give me 10 modified versions of this serialized code
${deserialized_serial}`;

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  const response = await platform.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    prompt
  });

  return json(response);
};
