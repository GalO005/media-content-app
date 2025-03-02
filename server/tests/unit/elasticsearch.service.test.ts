import { describe, it, expect, vi, beforeEach } from 'vitest';
import ElasticsearchService from '../../src/services/elasticsearch.service';

// Mock the elasticsearch client
vi.mock('@elastic/elasticsearch', () => {
    return {
        Client: vi.fn().mockImplementation(() => ({
            cluster: {
                health: vi.fn().mockResolvedValue({ status: 'green' }),
            },
            search: vi.fn().mockResolvedValue({
                hits: {
                    total: { value: 10 },
                    hits: [
                        {
                            _id: '1',
                            _source: {
                                bildnummer: '12345678',
                                datum: '2023-01-01',
                                suchtext: 'Test image',
                                fotografen: 'Test Photographer',
                                hoehe: '1080',
                                breite: '1920',
                                db: 'test-db',
                            },
                            sort: ['sort-value'],
                        },
                    ],
                },
                pit_id: 'test-pit-id',
            }),
            openPointInTime: vi.fn().mockResolvedValue({
                id: 'test-pit-id',
            }),
            closePointInTime: vi.fn().mockResolvedValue({
                succeeded: true,
            }),
        })),
    };
});

describe('ElasticsearchService', () => {
    let esService: ElasticsearchService;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Get the singleton instance
        esService = ElasticsearchService.getInstance();
    });

    describe('checkConnection', () => {
        it('should return true when the connection is successful', async () => {
            const result = await esService.checkConnection();
            expect(result).toBe(true);
        });

        it('should return false when the connection fails', async () => {
            // Mock the health check to throw an error
            vi.spyOn(esService['client'].cluster, 'health').mockRejectedValueOnce(new Error('Connection failed'));

            const result = await esService.checkConnection();
            expect(result).toBe(false);
        });
    });

    describe('createPit', () => {
        it('should create a point in time and return the PIT ID', async () => {
            const result = await esService.createPit();
            expect(result).toBe('test-pit-id');
            expect(esService['client'].openPointInTime).toHaveBeenCalledWith({
                index: esService['INDEX_NAME'],
                keep_alive: '5m',
            });
        });
    });

    describe('searchWithPit', () => {
        it('should search using a point in time', async () => {
            // Call the method
            const result = await esService.searchWithPit('test-pit-id', 10);

            // Check that the result has the expected structure
            expect(result).toHaveProperty('items');
            expect(result).toHaveProperty('total', 10);
            expect(result).toHaveProperty('urls');
            expect(result).toHaveProperty('pitId', 'test-pit-id');
            expect(result).toHaveProperty('searchAfter');

            // Check that the search method was called with the correct parameters
            expect(esService['client'].search).toHaveBeenCalledWith({
                size: 10,
                pit: {
                    id: 'test-pit-id',
                    keep_alive: '5m',
                },
                sort: [
                    { _score: 'desc' },
                    { _id: 'asc' },
                ],
                query: { match_all: {} },
                track_total_hits: true,
            });
        });
    });

    describe('deletePit', () => {
        it('should delete a point in time', async () => {
            // Call the method
            await esService.deletePit('test-pit-id');

            // Check that the closePointInTime method was called with the correct parameters
            expect(esService['client'].closePointInTime).toHaveBeenCalledWith({
                id: 'test-pit-id',
            });
        });
    });
}); 