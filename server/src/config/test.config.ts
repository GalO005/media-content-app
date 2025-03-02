/**
 * Configuration for test environment
 * This file contains settings used when running tests
 */

// Determine if we should use real services or mocks
export const USE_REAL_SERVICES = process.env.USE_REAL_SERVICES === 'true';

// Elasticsearch configuration for tests
// This points to an external Elasticsearch server
export const elasticsearchTestConfig = {
    // Use the same Elasticsearch URL as the production environment
    // This can be overridden with an environment variable
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 3,
    requestTimeout: 10000,
    ssl: {
        rejectUnauthorized: false
    }
};

// Test configuration
export const testConfig = {
    // Test index name - use a prefix to avoid conflicts with production data
    indexName: 'test-media',

    // Sample data for tests
    sampleData: [
        {
            bildnummer: '12345678',
            datum: '2023-01-15',
            suchtext: 'Test image 1',
            fotografen: 'Test Photographer',
            hoehe: '1080',
            breite: '1920',
            db: 'st'
        },
        {
            bildnummer: '87654321',
            datum: '2023-02-20',
            suchtext: 'Test image 2 with keywords',
            fotografen: 'Another Photographer',
            hoehe: '720',
            breite: '1280',
            db: 'sp'
        },
        {
            bildnummer: '11223344',
            datum: '2023-03-10',
            suchtext: 'Special test image',
            fotografen: 'Special Photographer',
            hoehe: '2160',
            breite: '3840',
            db: 'st',
            description: 'This is a special test image with description'
        }
    ]
}; 