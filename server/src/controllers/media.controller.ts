import { Request, Response } from 'express';
import ElasticsearchService from '../services/elasticsearch.service';

export class MediaController {
  private esService: ElasticsearchService;

  constructor() {
    this.esService = ElasticsearchService.getInstance();
  }

  public search = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        q: query = '', 
        page = 1, 
        limit = 50,
        type
      } = req.query;

      const pitId = req.headers['x-pit-id'] as string;
      const searchAfter = req.headers['x-search-after'] ? 
        JSON.parse(req.headers['x-search-after'] as string) : undefined;

      const result = await this.esService.searchWithPit(
        pitId || await this.esService.createPit(),
        Number(limit),
        searchAfter
      );

      res.json({
        items: result.items,
        total: result.total,
        page: Number(page),
        hasMore: result.items.length === Number(limit),
        metadata: {
          pitId: result.pitId,
          searchAfter: result.searchAfter
        }
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Search failed', 
        message: (error as Error).message 
      });
    }
  };

  public advancedSearch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        filters, 
        sortBy, 
        sortOrder,
        page = 1,
        limit = 50 
      } = req.body;

      // Implementation for advanced search
      // ...

      res.json({ /* results */ });
    } catch (error) {
      res.status(500).json({ 
        error: 'Advanced search failed', 
        message: (error as Error).message 
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