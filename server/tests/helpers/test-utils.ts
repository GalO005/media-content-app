import { vi } from 'vitest';

/**
 * Creates a mock Express request object
 * @param options - Options to customize the mock request
 * @returns A mock Express request object
 */
export function createMockRequest(options: {
    query?: Record<string, any>;
    params?: Record<string, any>;
    body?: any;
    headers?: Record<string, any>;
    method?: string;
    path?: string;
} = {}) {
    return {
        query: options.query || {},
        params: options.params || {},
        body: options.body || {},
        headers: options.headers || {},
        method: options.method || 'GET',
        path: options.path || '/',
    };
}

/**
 * Creates a mock Express response object with spies for common methods
 * @returns A mock Express response object
 */
export function createMockResponse() {
    const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        header: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
    };
    return res;
}

/**
 * Creates a mock Elasticsearch document
 * @param overrides - Properties to override in the default document
 * @returns A mock Elasticsearch document
 */
export function createMockMediaDocument(overrides: Record<string, any> = {}) {
    return {
        bildnummer: '12345678',
        datum: '2023-01-01',
        suchtext: 'Test image',
        fotografen: 'Test Photographer',
        hoehe: '1080',
        breite: '1920',
        db: 'test-db',
        ...overrides,
    };
}

/**
 * Creates a mock Elasticsearch search response
 * @param options - Options to customize the mock response
 * @returns A mock Elasticsearch search response
 */
export function createMockElasticsearchResponse(options: {
    total?: number;
    hits?: any[];
} = {}) {
    const total = options.total || 10;
    const hits = options.hits || [
        {
            _id: '1',
            _source: createMockMediaDocument(),
        },
    ];

    return {
        hits: {
            total: { value: total },
            hits,
        },
    };
}

/**
 * Waits for a specified number of milliseconds
 * @param ms - Milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
} 