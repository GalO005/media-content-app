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
  private static instance: ElasticsearchService;
  private readonly INDEX_NAME = 'imago';

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
      return true
    } catch (error) {
      console.error('Elasticsearch connection failed:', error)
      return false
    }
  }

  private formatMediaUrl(id: string, type: string): string {
    // Pad the ID to 10 characters with leading zeros
    let paddedId = id;
    while (paddedId.length < 10) {
      paddedId = '0' + paddedId;
    }
    return `${BASE_URL}/bild/${type}/${paddedId}/s.jpg`;
  }

  public async createPit(keepAlive: string = '5m'): Promise<string> {
    try {
      const response = await this.client.openPointInTime({
        index: this.INDEX_NAME,
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
      // Create query structure
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

      const response = await this.client.search(body);

      // Filter results client-side if query is provided
      let items = response.hits.hits.map((hit: any) => hit._source as MediaDocument);

      // Get the original total from Elasticsearch
      let originalTotal: number;
      if (typeof response.hits.total === 'number') {
        originalTotal = response.hits.total;
      } else if (response.hits.total && typeof response.hits.total === 'object' && 'value' in response.hits.total) {
        originalTotal = response.hits.total.value;
      } else {
        // Default to the number of items if we can't determine the total
        originalTotal = response.hits.hits.length;
      }

      // Track if we've applied any filtering
      let filteredResults = false;

      // Apply client-side filtering if query is provided
      if (query && query.trim() !== '') {
        filteredResults = true;
        const queryLower = query.trim().toLowerCase();
        items = items.filter((item: MediaDocument) => {
          return (
            (item.title && item.title.toLowerCase().includes(queryLower)) ||
            (item.suchtext && item.suchtext.toLowerCase().includes(queryLower)) ||
            (item.bildnummer && item.bildnummer.toLowerCase().includes(queryLower)) ||
            (item.fotografen && item.fotografen.toLowerCase().includes(queryLower)) ||
            (item.description && item.description.toLowerCase().includes(queryLower))
          );
        });
      }

      // Apply type filtering if provided
      if (type) {
        filteredResults = true;
        items = items.filter((item: MediaDocument) => item.db === type);
      }

      const urls = items.filter((item: MediaDocument) => item.bildnummer).map((item: MediaDocument) => this.formatMediaUrl(item.bildnummer, item.db));
      const lastSort = response.hits.hits[response.hits.hits.length - 1]?.sort;

      // Calculate final total based on filtering
      let finalTotal = originalTotal;
      if (filteredResults) {
        if (items.length === 0) {
          finalTotal = 0;
        } else if (response.hits.hits.length > 0) {
          if (items.length < 100) {
            finalTotal = items.length;
          } else {
            const estimatedTotal = Math.min(items.length * 10, originalTotal);
            finalTotal = estimatedTotal;
          }
        }
      }

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
    } catch (error) {
      console.error('Failed to enable ID fielddata:', error);
      throw error;
    }
  }
}

export default ElasticsearchService;