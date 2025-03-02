/**
 * Test setup file
 * This file is automatically imported by Vitest before running tests
 */

import { beforeAll, afterAll, vi } from 'vitest';
import { USE_REAL_SERVICES, elasticsearchTestConfig, testConfig } from '../src/config/test.config';

// Mock Elasticsearch client if not using real services
if (!USE_REAL_SERVICES) {
    // vi.mock must be at the top level, not inside conditionals or functions
    vi.mock('@elastic/elasticsearch', () => {
        return {
            Client: vi.fn(() => ({
                cluster: {
                    health: vi.fn().mockResolvedValue({ status: 'green' }),
                    putSettings: vi.fn().mockResolvedValue({ acknowledged: true })
                },
                search: vi.fn().mockResolvedValue({
                    hits: {
                        total: { value: 3 },
                        hits: testConfig.sampleData.map((doc, i) => ({
                            _id: `test-id-${i}`,
                            _source: doc,
                            sort: [i]
                        }))
                    },
                    pit_id: 'test-pit-id'
                }),
                openPointInTime: vi.fn().mockResolvedValue({ id: 'test-pit-id' }),
                closePointInTime: vi.fn().mockResolvedValue({ succeeded: true }),
                indices: {
                    exists: vi.fn().mockResolvedValue({ body: false }),
                    create: vi.fn().mockResolvedValue({ acknowledged: true }),
                    delete: vi.fn().mockResolvedValue({ acknowledged: true })
                },
                bulk: vi.fn().mockResolvedValue({ errors: false }),
                close: vi.fn().mockResolvedValue(undefined)
            }))
        };
    });
}

// Setup for real services
if (USE_REAL_SERVICES) {
    // Import Client only when using real services to avoid conflicts with the mock
    const { Client } = require('@elastic/elasticsearch');
    let client;

    beforeAll(async () => {
        console.log('Setting up test environment with real Elasticsearch...');

        // Create Elasticsearch client
        client = new Client(elasticsearchTestConfig);

        try {
            // Check if Elasticsearch is available
            const health = await client.cluster.health({});
            console.log(`Elasticsearch health: ${health.status}`);

            // Create test index with mappings
            const indexExists = await client.indices.exists({ index: testConfig.indexName });

            if (indexExists.body) {
                await client.indices.delete({ index: testConfig.indexName });
            }

            await client.indices.create({
                index: testConfig.indexName,
                body: {
                    mappings: {
                        properties: {
                            bildnummer: { type: 'keyword' },
                            datum: { type: 'date' },
                            suchtext: { type: 'text' },
                            fotografen: { type: 'keyword' },
                            hoehe: { type: 'keyword' },
                            breite: { type: 'keyword' },
                            db: { type: 'keyword' },
                            description: { type: 'text' }
                        }
                    }
                }
            });

            // Insert test data
            const operations = testConfig.sampleData.flatMap(doc => [
                { index: { _index: testConfig.indexName } },
                doc
            ]);

            await client.bulk({ refresh: true, body: operations });
            console.log(`Inserted ${testConfig.sampleData.length} test documents`);

        } catch (error) {
            console.error('Error setting up test environment:', error);
            throw error;
        }
    }, 30000); // 30 second timeout for setup

    afterAll(async () => {
        console.log('Cleaning up test environment...');

        try {
            // Delete test index
            await client.indices.delete({ index: testConfig.indexName });

            // Close client
            await client.close();

            console.log('Test environment cleanup complete');
        } catch (error) {
            console.error('Error cleaning up test environment:', error);
        }
    });
} 