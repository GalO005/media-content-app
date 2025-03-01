import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchParams } from '../types/media.types';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Define response and pagination types
interface SearchResponse {
  hasMore: boolean;
  metadata: {
    pitId: string;
    searchAfter: string[];
  };
  // Add other response fields as needed
  results: any[];
}

export const useMediaSearch = (params: SearchParams) => {
  return useInfiniteQuery<SearchResponse>({
    queryKey: ['media', params],
    
    queryFn: async ({ pageParam, queryKey }) => {
      const [_, searchParams] = queryKey as [string, SearchParams];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Build URL based on whether we have pagination metadata or just a page number
      let url = `${API_BASE_URL}/media/search`;
      
      if (typeof pageParam === 'number') {
        url += `?page=${pageParam}`;
      } else if (pageParam && typeof pageParam === 'object') {
        // Add pitId and searchAfter parameters if available
        const { pitId, searchAfter } = pageParam as { pitId: string; searchAfter: string[] };
        url += `?pitId=${encodeURIComponent(pitId)}&searchAfter=${encodeURIComponent(JSON.stringify(searchAfter))}`;
      }
      
      // Add other search params from the queryKey
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url += `&${key}=${encodeURIComponent(String(value))}`;
        }
      });

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return response.json();
    },
    
    initialPageParam: 0,
    
    getNextPageParam: (lastPage) => {
      // Check if there are more pages and return the pagination metadata
      return lastPage.hasMore 
        ? { pitId: lastPage.metadata.pitId, searchAfter: lastPage.metadata.searchAfter } 
        : undefined;
    },
  });
};