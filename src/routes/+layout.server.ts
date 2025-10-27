import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return {
		version: __APP_VERSION__
	};
};
