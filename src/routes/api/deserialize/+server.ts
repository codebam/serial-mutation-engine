import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { serial_b85 } = await request.json();

  const response = await fetch('https://borderlands4-deserializer.nicnl.com/api/v1/deserialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ serial_b85 }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
