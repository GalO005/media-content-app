import { Client } from '@elastic/elasticsearch';
import elasticsearchConfig from '../config/elasticsearch.config'

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
}

export default ElasticsearchService;