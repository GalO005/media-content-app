export interface MediaItem {
  id?: string;
  bildnummer?: string;
  type?: 'st' | 'sp';
  title?: string;
  description?: string;
  suchtext?: string;
  fotografen?: string;
  datum?: string;
  hoehe?: string;
  breite?: string;
  db?: string;
  url?: string;
}

export interface SearchResponse {
  items: MediaItem[];
  total: number;
  page: number;
  hasMore: boolean;
  metadata: {
    pitId: string;
    searchAfter: any[];
  };
}

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  type?: 'st' | 'sp';
}