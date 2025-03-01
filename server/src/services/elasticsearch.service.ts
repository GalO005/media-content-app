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
        console.log(id);
        const paddedId = id.padStart(10, '0');
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
          const items = hits.map(hit => hit._source as MediaDocument);
          const urls = items.map(item => this.formatMediaUrl(item.bildnummer, item.db));
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
          console.error('Failed to create PIT:', error);
          throw error;
        }
      }

      public async searchWithPit(
        pitId: string, 
        size: number = 1000, 
        searchAfter?: any[]
      ): Promise<PitResult> {
        try {
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
            query: { match_all: {} }
          };
    
          if (searchAfter) {
            body.search_after = searchAfter;
          }
    
          const response = await this.client.search(body);
    
          const items = response.hits.hits.map(hit => hit._source as MediaDocument);
          console.log('ITEMS:',items.filter(item => !item.bildnummer));
          const urls = items.filter(item => item.bildnummer).map(item => this.formatMediaUrl(item.bildnummer, item.db));
          const lastSort = response.hits.hits[response.hits.hits.length - 1]?.sort;
    
          return {
            items,
            urls,
            pitId: response.pit_id ?? '',
            searchAfter: lastSort,
            total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0
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
        const batchSize = 1000;
        
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
            console.log('RES:',result.searchAfter)
            console.log('RES@:',result.items.length)

          }

      
          return allItems;
        } catch (err) {
            console.error('Failed to retrieve all media:', err);
        } 
          await esService.deletePit(pitId);
      }
}

export default ElasticsearchService;