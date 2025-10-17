
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial } = await request.json();

  if (!deserialized_serial) {
    return json({ error: 'Missing deserialized_serial' }, { status: 400 });
  }

  const prompt = `Generate one modified and unique version of the following serialized code. Only modify the values in the last few bracketed sections. Keep the beginning of the code unchanged. Output only the modified code.\n\n${deserialized_serial}`;

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  const response = await platform.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    prompt
  });

  return json(response);
};
