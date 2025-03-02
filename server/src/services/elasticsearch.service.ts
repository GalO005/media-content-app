import { Client, estypes } from '@elastic/elasticsearch';
import elasticsearchConfig from '../config/elasticsearch.config'

const BASE_URL = 'https://www.imago-images.de';

interface MediaDocument {
  bildnummer: string; // Image number
  datum: string; // Date in ISO format
  suchtext: string; // Description or caption
  fotografen: string; // Photographer
  hoehe: string; // Height 
  breite: string; // Width
  db: string; // Database or source name
  title?: string; // Title
  description?: string; // Description
}


export interface SearchParams {
  keyword?: string;
  type?: 'st' | 'sp';
  page?: number;
  limit?: number;
}

interface PitResult {
  items: MediaDocument[];
  urls: string[];
  pitId: string;
  searchAfter?: any[];
  total: number;
}

class ElasticsearchService {
  private client!: Client;
  private static instance: ElasticsearchService

  private constructor() {
    this.client = new Client(elasticsearchConfig)
  }

  public static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService()
    }
    return ElasticsearchService.instance
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health({})
      console.log('Elasticsearch connected', health)
      return true
    } catch (error) {
      console.error('Elasticsearch connection failed:', error)
      return false
    }
  }

  public getClient(): Client {
    return this.client
  }

  private formatMediaUrl(id: string, type: string): string {
    // Pad the ID to 10 characters with leading zeros
    let paddedId = id;
    while (paddedId.length < 10) {
      paddedId = '0' + paddedId;
    }
    return `${BASE_URL}/bild/${type}/${paddedId}/s.jpg`;
  }

  public async searchMedia(params: SearchParams): Promise<{
    items: MediaDocument[];
    total: number;
    urls: string[];
  }> {
    const { keyword, type, page = 1, limit = 10 } = params;

    const query = {
      bool: {
        must: [
          keyword ? {
            multi_match: {
              query: keyword,
              fields: ['title', 'description', 'metadata.*']
            }
          } : { match_all: {} },
          ...(type ? [{ term: { type } }] : [])
        ]
      }
    };

    try {
      const response: estypes.SearchResponse<MediaDocument> = await this.client.search<MediaDocument>({
        index: 'imago',
        body: {
          query,
          from: (page - 1) * limit,
          size: limit,
          sort: [{ _score: { order: 'desc' } }]
        }
      });

      const hits = response.hits.hits;
      const items = hits.map((hit: any) => hit._source as MediaDocument);
      const urls = items.map((item: MediaDocument) => this.formatMediaUrl(item.bildnummer, item.db));
      return {
        items,
        total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0,
        urls
      };
    } catch (error) {
      console.error('Failed to search media:', error);
      throw error;
    }
  }

  public async createPit(keepAlive: string = '5m'): Promise<string> {
    try {
      const response = await this.client.openPointInTime({
        index: 'imago',
        keep_alive: keepAlive
      });
      return response.id;
    } catch (error) {
      console.error('Error creating PIT:', error);
      throw error;
    }
  }

  public async searchWithPit(
    pitId: string,
    size: number = 50,
    searchAfter?: any[],
    query: string = '',
    type?: string
  ): Promise<PitResult> {
    try {
      // Log the incoming parameters for debugging
      console.log('SearchWithPit params:', { pitId, size, searchAfter, query, type });

      // Create a simpler query structure
      const body: any = {
        size,
        pit: {
          id: pitId,
          keep_alive: '5m'
        },
        sort: [
          { _score: 'desc' },
          { _id: 'asc' }
        ],
        query: { match_all: {} },
        track_total_hits: true
      };

      // Add search_after if provided
      if (searchAfter) {
        body.search_after = searchAfter;
      }

      // Log the query body for debugging
      console.log('Elasticsearch query body:', JSON.stringify(body, null, 2));

      const response = await this.client.search(body);

      // Log the raw response total for debugging
      console.log('Raw Elasticsearch response total:', JSON.stringify(response.hits.total));

      // Filter results client-side if query is provided
      let items = response.hits.hits.map((hit: any) => hit._source as MediaDocument);

      // Get the original total from Elasticsearch
      // Make sure we're correctly extracting the total from the response
      let originalTotal: number;
      if (typeof response.hits.total === 'number') {
        originalTotal = response.hits.total;
      } else if (response.hits.total && typeof response.hits.total === 'object' && 'value' in response.hits.total) {
        originalTotal = response.hits.total.value;
      } else {
        // Default to the number of items if we can't determine the total
        originalTotal = response.hits.hits.length;
        console.warn('Could not determine total from Elasticsearch response, using hits length');
      }

      console.log('Original Elasticsearch total:', originalTotal);

      // Track if we've applied any filtering
      let filteredResults = false;

      // Apply client-side filtering if query is provided
      if (query && query.trim() !== '') {
        filteredResults = true;
        const queryLower = query.trim().toLowerCase();
        const beforeFilterCount = items.length;
        items = items.filter((item: MediaDocument) => {
          return (
            (item.title && item.title.toLowerCase().includes(queryLower)) ||
            (item.suchtext && item.suchtext.toLowerCase().includes(queryLower)) ||
            (item.bildnummer && item.bildnummer.toLowerCase().includes(queryLower)) ||
            (item.fotografen && item.fotografen.toLowerCase().includes(queryLower)) ||
            (item.description && item.description.toLowerCase().includes(queryLower))
          );
        });
        console.log(`Client-side query filtering: ${beforeFilterCount} -> ${items.length} items`);
      }

      // Apply type filtering if provided
      if (type) {
        filteredResults = true;
        const beforeFilterCount = items.length;
        items = items.filter((item: MediaDocument) => item.db === type);
        console.log(`Client-side type filtering: ${beforeFilterCount} -> ${items.length} items`);
      }

      const urls = items.filter((item: MediaDocument) => item.bildnummer).map((item: MediaDocument) => this.formatMediaUrl(item.bildnummer, item.db));
      const lastSort = response.hits.hits[response.hits.hits.length - 1]?.sort;

      // If we've applied filtering, we can't know the exact total without fetching all results
      // For now, we'll use a more conservative approach for the estimated total
      let finalTotal = originalTotal;
      if (filteredResults) {
        if (items.length === 0) {
          // If no items match the filter, total should be 0
          finalTotal = 0;
          console.log(`No items match the filter, setting total to 0`);
        } else if (response.hits.hits.length > 0) {
          // Instead of using a ratio-based estimate which can be wildly inaccurate,
          // we'll use a more conservative approach:
          // 1. For small result sets (< 100 items), just use the actual filtered count
          // 2. For larger sets, use a small multiple of the current filtered count
          if (items.length < 100) {
            finalTotal = items.length;
            console.log(`Small result set (${items.length} items), using actual count as total`);
          } else {
            // Assume we're seeing about 10% of the total results in the current page
            // This is a conservative estimate that prevents wildly inflated numbers
            const estimatedTotal = Math.min(items.length * 10, originalTotal);
            finalTotal = estimatedTotal;
            console.log(`Estimated total after filtering: ${estimatedTotal} (conservative estimate)`);
          }
        }
      }

      console.log(`Final total: ${finalTotal} (filtered: ${filteredResults})`);

      return {
        items,
        urls,
        pitId: response.pit_id ?? '',
        searchAfter: lastSort,
        total: finalTotal
      };
    } catch (error) {
      console.error('Failed to search with PIT:', error);
      throw error;
    }
  }

  public async deletePit(pitId: string): Promise<void> {
    try {
      await this.client.closePointInTime({
        id: pitId
      });
    } catch (error) {
      console.error('Failed to delete PIT:', error);
      throw error;
    }
  }

  public async enableIdFielddata(): Promise<void> {
    try {
      await this.client.cluster.putSettings({
        body: {
          persistent: {
            "indices.id_field_data.enabled": true
          }
        }
      });
      console.log('Successfully enabled ID fielddata');
    } catch (error) {
      console.error('Failed to enable ID fielddata:', error);
      throw error;
    }
  }

  public async retrieveAllMediaWithPit() {
    const esService = ElasticsearchService.getInstance();
    const allItems: MediaDocument[] = [];
    const batchSize = 50;

    await esService.enableIdFielddata();

    // Create PIT
    const pitId = await esService.createPit();

    try {
      let result = await esService.searchWithPit(pitId, batchSize);
      allItems.push(...result.items);

      while (result.items.length === batchSize && result.searchAfter) {
        result = await esService.searchWithPit(
          result.pitId,
          batchSize,
          result.searchAfter
        );
        allItems.push(...result.items);

        console.log(`Retrieved ${allItems.length} items so far...`);
        console.log('RES:', result.searchAfter)
        console.log('RES@:', result.items.length)
      }

      return allItems;
    } catch (err) {
      console.error('Failed to retrieve all media:', err);
    }
    await esService.deletePit(pitId);
  }
}

export default ElasticsearchService;