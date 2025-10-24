import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

import sveltekitApiGenerator from 'vite-plugin-sveltekit-api-generator';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/lib/worker/worker.spec.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'browser',
					environment: 'jsdom',
					setupFiles: ['@vitest/web-worker'],
					include: ['src/lib/worker/worker.spec.ts']
				}
			}
		]
	}
});
