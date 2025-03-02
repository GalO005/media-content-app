import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['./tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
        environmentOptions: {
            // Pass environment variables to tests
            env: {
                NODE_ENV: process.env.NODE_ENV || 'test',
                USE_REAL_SERVICES: process.env.USE_REAL_SERVICES || 'false',
                ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
            }
        },
        testTimeout: 10000, // 10 seconds timeout for tests
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
}); 