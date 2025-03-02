import { Request, Response } from 'express';
import ElasticsearchService from '../services/elasticsearch.service';

// Simple in-memory cache for PIT IDs
// This will store PIT IDs by query string to reuse them for the same search
interface PitCache {
  [key: string]: {
    pitId: string;
    timestamp: number;
  };
}

export class MediaController {
  private esService: ElasticsearchService;
  private pitCache: PitCache = {};
  // PIT expiration time in milliseconds (4 minutes to be safe with 5m server-side expiration)
  private readonly PIT_EXPIRATION = 4 * 60 * 1000;

  constructor() {
    this.esService = ElasticsearchService.getInstance();
  }

  public search = async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract and validate query parameters
      const {
        q: rawQuery = '',
        page: rawPage = '1',
        limit: rawLimit = '50',
        type
      } = req.query;

      // Ensure query is a string and trim it
      const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';

      // Parse page and limit as numbers with fallbacks
      const page = parseInt(String(rawPage), 10) || 1;
      const limit = parseInt(String(rawLimit), 10) || 50;

      // Create a cache key based on the query and type
      const cacheKey = `${query}:${type || 'all'}`;

      // Get or create PIT ID
      let pitId = req.headers['x-pit-id'] as string;
      let isNewPit = false;

      if (pitId) {
        // Client provided a PIT ID, update the cache
        this.pitCache[cacheKey] = {
          pitId,
          timestamp: Date.now()
        };
      } else {
        // Check if we have a cached PIT ID for this query
        const cachedPit = this.pitCache[cacheKey];
        const now = Date.now();

        if (cachedPit && (now - cachedPit.timestamp) < this.PIT_EXPIRATION) {
          // Use the cached PIT ID if it's not expired
          pitId = cachedPit.pitId;
        } else {
          // Create a new PIT ID
          pitId = await this.esService.createPit();
          isNewPit = true;

          // Cache the new PIT ID
          this.pitCache[cacheKey] = {
            pitId,
            timestamp: now
          };
        }
      }

      // Parse search after if provided
      let searchAfter;
      try {
        if (req.headers['x-search-after']) {
          searchAfter = JSON.parse(req.headers['x-search-after'] as string);
        }
      } catch (parseError) {
        console.error('Error parsing search_after:', parseError);
        res.status(400).json({
          error: 'Invalid search_after parameter',
          message: 'The search_after parameter could not be parsed as JSON'
        });
        return;
      }

      // Get the current page from headers if available (for PIT pagination)
      let currentPage = page;
      if (req.headers['x-current-page']) {
        const headerPage = parseInt(String(req.headers['x-current-page']), 10);
        if (!isNaN(headerPage)) {
          currentPage = headerPage;
        }
      } else if (isNewPit || (pitId && !searchAfter)) {
        // If we created a new PIT or have a PIT ID but no search_after, we're on page 1
        currentPage = 1;
      }

      try {
        // Perform the search
        const result = await this.esService.searchWithPit(
          pitId,
          limit,
          searchAfter,
          query,
          type as string
        );

        // Calculate if there are more results
        const hasMore = result.items.length === limit && result.total > result.items.length;

        // Map the items to include the URLs
        const itemsWithUrls = result.items.map((item, index) => ({
          ...item,
          url: result.urls[index] || null
        }));

        res.json({
          items: itemsWithUrls,
          total: result.total,
          page: currentPage,
          hasMore: hasMore,
          metadata: {
            pitId: result.pitId,
            searchAfter: result.searchAfter,
            currentPage: currentPage
          }
        });
      } catch (error) {
        // Check if the error is related to an expired PIT
        if (error instanceof Error &&
          (error.message.includes('PIT not found') ||
            error.message.includes('No search context found'))) {

          // Remove the expired PIT from cache
          delete this.pitCache[cacheKey];

          // Create a new PIT
          pitId = await this.esService.createPit();

          // Update the cache
          this.pitCache[cacheKey] = {
            pitId,
            timestamp: Date.now()
          };

          // Try the search again with the new PIT
          const result = await this.esService.searchWithPit(
            pitId,
            limit,
            undefined, // Reset search_after since we're starting fresh
            query,
            type as string
          );

          // Reset to page 1 since we're starting with a new PIT
          currentPage = 1;

          const hasMore = result.items.length === limit && result.total > result.items.length;

          // Map the items to include the URLs
          const itemsWithUrls = result.items.map((item, index) => ({
            ...item,
            url: result.urls[index] || null
          }));

          res.json({
            items: itemsWithUrls,
            total: result.total,
            page: currentPage,
            hasMore: hasMore,
            metadata: {
              pitId: result.pitId,
              searchAfter: result.searchAfter,
              currentPage: currentPage,
              pitReset: true // Flag to indicate the PIT was reset
            }
          });
        } else {
          // Re-throw other errors to be caught by the outer catch block
          throw error;
        }
      }
    } catch (error) {
      console.error('Search error:', error);

      // Provide error information without stack traces in production
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      res.status(500).json({
        error: 'Search failed',
        message: errorMessage
      });
    }
  };

  public createPit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { keepAlive = '5m' } = req.body;
      const pitId = await this.esService.createPit(keepAlive);
      res.json({ pitId });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create PIT',
        message: (error as Error).message
      });
    }
  };

  public deletePit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.esService.deletePit(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: 'Failed to delete PIT',
        message: (error as Error).message
      });
    }
  };
}