import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mediaRouter from '../../src/routes/media.routes';
import ElasticsearchService from '../../src/services/elasticsearch.service';

// Mock the ElasticsearchService
vi.mock('../../src/services/elasticsearch.service', () => {
    return {
        default: {
            getInstance: vi.fn().mockReturnValue({
                checkConnection: vi.fn().mockResolvedValue(true),
                createPit: vi.fn().mockResolvedValue('test-pit-id'),
                searchWithPit: vi.fn().mockResolvedValue({
                    items: [
                        {
                            id: '1',
                            bildnummer: '12345678',
                            datum: '2023-01-01',
                            suchtext: 'Test image',
                            fotografen: 'Test Photographer',
                            hoehe: '1080',
                            breite: '1920',
                            db: 'test-db',
                        },
                    ],
                    total: 10,
                    urls: {
                        thumbnail: 'http://example.com/thumbnail/12345678',
                        preview: 'http://example.com/preview/12345678',
                        original: 'http://example.com/original/12345678',
                    },
                    pitId: 'test-pit-id',
                    searchAfter: ['sort-value'],
                }),
                deletePit: vi.fn().mockResolvedValue(true),
            }),
        },
    };
});

describe('API Integration Tests', () => {
    let app: express.Application;
    let server: any;

    beforeAll(() => {
        // Create Express app
        app = express();

        // Add middleware
        app.use(express.json());
        app.use(cors());

        // Add routes
        app.use('/api/v1/media', mediaRouter);

        // Add health check endpoint
        app.get('/api/v1/health', (req, res) => {
            res.status(200).json({ status: 'ok' });
        });

        // Start server on a different port to avoid conflicts
        server = app.listen(3001);
    });

    afterAll(() => {
        // Close server after tests
        server.close();
    });

    describe('GET /api/v1/health', () => {
        it('should return 200 OK with status message', async () => {
            const response = await request(app).get('/api/v1/health');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
    });

    describe('GET /api/v1/media/search', () => {
        it('should return search results with default parameters', async () => {
            const response = await request(app).get('/api/v1/media/search');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('hasMore');
            expect(response.body).toHaveProperty('metadata');
        });

        it('should handle query parameters', async () => {
            // Reset the mock to clear previous calls
            vi.clearAllMocks();

            const response = await request(app)
                .get('/api/v1/media/search')
                .query({
                    q: 'test',
                    limit: '20',
                    type: 'st',
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('total');

            // Check that the searchWithPit method was called with the correct parameters
            const esService = ElasticsearchService.getInstance();
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId (controller creates a new one)
                20, // limit from query
                undefined, // searchAfter
                'test', // query
                'st' // type
            );
        });

        it('should handle PIT ID in headers', async () => {
            // Reset the mock to clear previous calls
            vi.clearAllMocks();

            const response = await request(app)
                .get('/api/v1/media/search')
                .set('x-pit-id', 'test-pit-id');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('total');

            // Check that the searchWithPit method was called with the correct parameters
            const esService = ElasticsearchService.getInstance();
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId from headers
                50, // default limit
                undefined, // searchAfter
                '', // default empty query
                undefined // type
            );
        });

        it('should handle search-after in headers', async () => {
            // Reset the mock to clear previous calls
            vi.clearAllMocks();

            const response = await request(app)
                .get('/api/v1/media/search')
                .set('x-search-after', JSON.stringify(['test-sort-value']));

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('total');

            // Check that the searchWithPit method was called with the correct parameters
            const esService = ElasticsearchService.getInstance();
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId (controller creates a new one)
                50, // default limit
                ['test-sort-value'], // searchAfter from headers
                '', // default empty query
                undefined // type
            );
        });
    });

    describe('POST /api/v1/media/pit', () => {
        it('should create a new PIT and return the ID', async () => {
            const response = await request(app)
                .post('/api/v1/media/pit');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ pitId: 'test-pit-id' });

            // Check that the createPit method was called
            const esService = ElasticsearchService.getInstance();
            expect(esService.createPit).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/v1/media/pit/:id', () => {
        it('should delete a PIT and return 204 status', async () => {
            const response = await request(app)
                .delete('/api/v1/media/pit/test-pit-id');

            expect(response.status).toBe(204);

            // Check that the deletePit method was called with the correct parameters
            const esService = ElasticsearchService.getInstance();
            expect(esService.deletePit).toHaveBeenCalledWith('test-pit-id');
        });
    });
}); 