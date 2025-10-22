import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        package: {
            source: 'src/lib',
            dir: 'dist',
            exports: (filepath) => {
                return filepath.endsWith('api.ts');
            }
        }
    }
};

export default config;
