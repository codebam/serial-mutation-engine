
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial } = await request.json();

  if (!deserialized_serial) {
    return json({ error: 'Missing deserialized_serial' }, { status: 400 });
  }

  const prompt = `Your task is to generate one modified and unique version of the following serialized code. You must only output the modified code. Do not output any other text, explanations, or introductions. When modifying the code, only change the values at the end of the string. For example, in the code '312, 0, 1, 50| 2, 3819|| {9} {246:[...]} {248:27} {8} {8}', modifications should start from '{248:27}'. The goal is to keep the beginning of the code unchanged.\n\n${deserialized_serial}`;

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  const response = await platform.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    prompt
  });

  return json(response);
};
