import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		theme: locals.theme,
		version: __APP_VERSION__
	};
};
