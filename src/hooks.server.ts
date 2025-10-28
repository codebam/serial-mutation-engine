import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get('theme') || 'g100';
	event.locals.theme = theme;

	const allowedOrigins = [
		'https://borderlands4-deserializer.nicnl.com',
		'https://serial-mutation-engine.pages.dev'
	];
	const origin = event.request.headers.get('origin');

	if (origin && allowedOrigins.includes(origin)) {
		if (event.request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Allow-Origin': origin,
					'Access-Control-Allow-Headers': 'Content-Type, Authorization'
				}
			});
		}

		const response = await resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%theme%', theme)
		});
		response.headers.set('Access-Control-Allow-Origin', origin);
		return response;
	}

	return await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme%', theme)
	});
};
