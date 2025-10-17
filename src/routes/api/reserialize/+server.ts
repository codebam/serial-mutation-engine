import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { deserialized } = await request.json();

  const response = await fetch('https://borderlands4-deserializer.nicnl.com/api/v1/reserialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deserialized }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
