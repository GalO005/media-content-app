import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaController } from '../../src/controllers/media.controller';
import ElasticsearchService from '../../src/services/elasticsearch.service';
import { createMockRequest, createMockResponse } from '../helpers/test-utils';

// Mock the ElasticsearchService
vi.mock('../../src/services/elasticsearch.service', () => {
    return {
        default: {
            getInstance: vi.fn().mockReturnValue({
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

describe('MediaController', () => {
    let controller: MediaController;
    let mockReq: any;
    let mockRes: any;
    let esService: any;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Create a new instance of the controller
        controller = new MediaController();

        // Create mock request and response objects
        mockReq = createMockRequest();
        mockRes = createMockResponse();

        // Get the mocked ElasticsearchService instance
        esService = ElasticsearchService.getInstance();
    });

    describe('search', () => {
        it('should handle search with default parameters', async () => {
            // Set up the request
            mockReq.query = {};

            // Call the method
            await controller.search(mockReq, mockRes);

            // Check that the searchWithPit method was called with the correct parameters
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId (controller creates a new one)
                50, // default limit
                undefined, // searchAfter
                '', // default empty query
                undefined // type
            );

            // Check that the response was sent
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('should handle search with query parameters', async () => {
            // Set up the request
            mockReq.query = {
                q: 'test',
                limit: '20',
                type: 'st',
            };

            // Call the method
            await controller.search(mockReq, mockRes);

            // Check that the searchWithPit method was called with the correct parameters
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId (controller creates a new one)
                20, // limit from query
                undefined, // searchAfter
                'test', // query
                'st' // type
            );

            // Check that the response was sent
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('should handle search with PIT ID in headers', async () => {
            // Set up the request
            mockReq.query = {};
            mockReq.headers = {
                'x-pit-id': 'test-pit-id',
            };

            // Call the method
            await controller.search(mockReq, mockRes);

            // Check that the searchWithPit method was called with the correct parameters
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId from headers
                50, // default limit
                undefined, // searchAfter
                '', // default empty query
                undefined // type
            );

            // Check that the response was sent
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('should handle search with search-after in headers', async () => {
            // Set up the request
            mockReq.query = {};
            mockReq.headers = {
                'x-search-after': JSON.stringify(['test-sort-value']),
            };

            // Call the method
            await controller.search(mockReq, mockRes);

            // Check that the searchWithPit method was called with the correct parameters
            expect(esService.searchWithPit).toHaveBeenCalledWith(
                'test-pit-id', // pitId (controller creates a new one)
                50, // default limit
                ['test-sort-value'], // searchAfter from headers
                '', // default empty query
                undefined // type
            );

            // Check that the response was sent
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('should handle errors during search', async () => {
            // Mock the searchWithPit method to throw an error
            esService.searchWithPit.mockRejectedValueOnce(new Error('Search failed'));

            // Set up the request
            mockReq.query = {};

            // Call the method
            await controller.search(mockReq, mockRes);

            // Check that the response was sent with an error status
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Search failed',
                message: 'Search failed'
            });
        });
    });

    describe('createPit', () => {
        it('should create a new PIT and return the ID', async () => {
            // Call the method
            await controller.createPit(mockReq, mockRes);

            // Check that the createPit method was called
            expect(esService.createPit).toHaveBeenCalled();

            // Check that the response was sent with the PIT ID
            expect(mockRes.json).toHaveBeenCalledWith({
                pitId: 'test-pit-id',
            });
        });

        it('should handle errors during PIT creation', async () => {
            // Mock the createPit method to throw an error
            esService.createPit.mockRejectedValueOnce(new Error('PIT creation failed'));

            // Call the method
            await controller.createPit(mockReq, mockRes);

            // Check that the response was sent with an error status
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Failed to create PIT',
                message: 'PIT creation failed'
            });
        });
    });

    describe('deletePit', () => {
        it('should delete a PIT and return a success status', async () => {
            // Set up the request
            mockReq.params = {
                id: 'test-pit-id',
            };

            // Call the method
            await controller.deletePit(mockReq, mockRes);

            // Check that the deletePit method was called with the correct parameters
            expect(esService.deletePit).toHaveBeenCalledWith('test-pit-id');

            // Check that the response was sent with a success status
            expect(mockRes.status).toHaveBeenCalledWith(204);
            expect(mockRes.send).toHaveBeenCalled();
        });

        it('should handle errors during PIT deletion', async () => {
            // Mock the deletePit method to throw an error
            esService.deletePit.mockRejectedValueOnce(new Error('PIT deletion failed'));

            // Set up the request
            mockReq.params = {
                id: 'test-pit-id',
            };

            // Call the method
            await controller.deletePit(mockReq, mockRes);

            // Check that the response was sent with an error status
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Failed to delete PIT',
                message: 'PIT deletion failed'
            });
        });
    });
}); 