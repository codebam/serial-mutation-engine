
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
  const { deserialized_serial, prompt, model } = await request.json();

  if (!deserialized_serial || !prompt || !model) {
    return json({ error: 'Missing deserialized_serial, prompt, or model' }, { status: 400 });
  }

  const finalPrompt = prompt.replace('${deserialized_serial}', deserialized_serial);

  if (!platform?.env?.AI) {
    return json({ error: 'AI binding not found' }, { status: 500 });
  }

  let data: any = { prompt: finalPrompt };
  if (model.startsWith('@cf/openai/')) {
    data = { input: { text: finalPrompt } };
  }

  try {
    const response = await platform.env.AI.run(model, data);
    return json(response);
  } catch (e: any) {
    return json({ error: e.message }, { status: 500 });
  }
};
