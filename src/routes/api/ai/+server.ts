
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial } = await request.json();

  if (!deserialized_serial) {
    return json({ error: 'Missing deserialized_serial' }, { status: 400 });
  }

  const prompt = `Given the following serialized code, provide 10 modified and unique versions of it. Only output the modified code, with each version on a new line. Do not include any other text or explanations.\n\n${deserialized_serial}`;

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  const response = await platform.env.AI.run('@cf/meta/llama-3-8b-instruct', {
    prompt
  });

  return json(response);
};
