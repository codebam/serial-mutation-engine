import { generateOpenApi } from '@obele-michael/swagger-ui-svelte/generator';

generateOpenApi({
    routesDir: './src/routes',
    outputFile: './static/openapi.json',
    apiBase: '/api',
    info: {
        title: 'Serial Generator API',
        version: '1.0.0',
        description: 'API for encoding and decoding serials.',
    },
});