
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial, prompt } = await request.json();

  if (!deserialized_serial || !prompt) {
    return json({ error: 'Missing deserialized_serial or prompt' }, { status: 400 });
  }

  const finalPrompt = prompt.replace('${deserialized_serial}', deserialized_serial);

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  const response = await platform.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    prompt: finalPrompt
  });

  return json(response);
};
