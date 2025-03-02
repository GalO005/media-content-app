import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchParams, SearchResponse } from '../types/media.types';
import { useRef, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Helper function to check if an error is PIT-related
const isPitError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('PIT not found') ||
      error.message.includes('No search context found') ||
      error.message.includes('search_context_missing')
    );
  }
  return false;
};

// Helper functions to manage PIT IDs in localStorage
const getPitIdFromStorage = (query: string): string | null => {
  try {
    const storageKey = `pit_id_${query || 'default'}`;
    const storedData = localStorage.getItem(storageKey);
    if (!storedData) return null;

    const { pitId, timestamp } = JSON.parse(storedData);

    // Check if the PIT ID is expired (older than 4 minutes)
    const now = Date.now();
    const expirationTime = 4 * 60 * 1000; // 4 minutes

    if (now - timestamp > expirationTime) {
      // PIT ID is expired, remove it from storage
      localStorage.removeItem(storageKey);
      return null;
    }

    return pitId;
  } catch (error) {
    console.error('Error retrieving PIT ID from localStorage:', error);
    return null;
  }
};

const savePitIdToStorage = (query: string, pitId: string): void => {
  try {
    const storageKey = `pit_id_${query || 'default'}`;
    const data = {
      pitId,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving PIT ID to localStorage:', error);
  }
};

const removePitIdFromStorage = (query: string): void => {
  try {
    const storageKey = `pit_id_${query || 'default'}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error removing PIT ID from localStorage:', error);
  }
};

export const useMediaSearch = (params: SearchParams) => {
  // Create a new query key whenever the query parameter changes
  const queryKey = ['media', params.query || '', params];

  // Use a ref to store the PIT ID from the first page response
  const firstPagePitIdRef = useRef<string | null>(null);

  // Store the current query to detect changes
  const previousQueryRef = useRef<string>(params.query || '');

  // Initialize the PIT ID from localStorage on mount
  useEffect(() => {
    const storedPitId = getPitIdFromStorage(params.query || '');
    if (storedPitId) {
      console.log('Retrieved PIT ID from localStorage:', storedPitId);
      firstPagePitIdRef.current = storedPitId;
    }
  }, []);

  // Reset the stored PIT ID when the query changes
  useEffect(() => {
    const currentQuery = params.query || '';
    if (currentQuery !== previousQueryRef.current) {
      console.log('Query changed from', previousQueryRef.current, 'to', currentQuery);
      console.log('Resetting stored PIT ID:', firstPagePitIdRef.current);

      // Remove the old PIT ID from storage
      removePitIdFromStorage(previousQueryRef.current);

      // Reset the ref
      firstPagePitIdRef.current = null;
      previousQueryRef.current = currentQuery;

      // Check if there's a stored PIT ID for the new query
      const storedPitId = getPitIdFromStorage(currentQuery);
      if (storedPitId) {
        console.log('Found stored PIT ID for new query:', storedPitId);
        firstPagePitIdRef.current = storedPitId;
      }
    }
  }, [params.query]);

  // Log the current state of the PIT ID ref for debugging
  useEffect(() => {
    console.log('Current PIT ID state:', firstPagePitIdRef.current);
  }, []);

  return useInfiniteQuery<SearchResponse>({
    queryKey,

    queryFn: async ({ pageParam, queryKey }) => {
      const [_, queryValue, searchParams] = queryKey as [string, string, SearchParams];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      try {
        // Build URL based on whether we have pagination metadata or just a page number
        let url = `${API_BASE_URL}/media/search`;

        // Add query parameters
        const queryParams = new URLSearchParams();

        // Add pagination parameters
        let currentPage = 1;

        // If we have a stored PIT ID from a previous request, always use it
        if (firstPagePitIdRef.current) {
          console.log('Using stored PIT ID for request:', firstPagePitIdRef.current);
          headers['x-pit-id'] = firstPagePitIdRef.current;
        }

        if (typeof pageParam === 'number') {
          currentPage = pageParam;
          queryParams.append('page', pageParam.toString());

          // Set the current page in headers when using a stored PIT ID
          if (firstPagePitIdRef.current) {
            headers['x-current-page'] = currentPage.toString();
          }
        } else if (pageParam && typeof pageParam === 'object') {
          // For PIT-based pagination, use headers instead of query params
          const { pitId, searchAfter, page } = pageParam as {
            pitId: string;
            searchAfter: any[];
            page?: number;
          };

          // Override the stored PIT ID with the one from pageParam
          headers['x-pit-id'] = pitId;
          headers['x-search-after'] = JSON.stringify(searchAfter);

          // Pass the current page in the headers
          if (page) {
            currentPage = page;
            headers['x-current-page'] = page.toString();
          }
        }

        // Add other search params from the queryKey
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'page') {
            // Use 'q' as the query parameter name for the server
            if (key === 'query') {
              // Only add the query parameter if it's not empty
              if (value && String(value).trim() !== '') {
                queryParams.append('q', String(value).trim());
              }
            } else {
              queryParams.append(key, String(value));
            }
          }
        });

        // Append query parameters to URL
        const urlParams = queryParams.toString();
        if (urlParams) {
          url += `?${urlParams}`;
        }

        console.log('Fetching:', url, headers);
        const response = await fetch(url, { headers });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Search failed:', response.status, errorText);
          throw new Error(`Search failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Search response:', {
          total: data.total,
          page: data.page,
          hasMore: data.hasMore,
          itemsCount: data.items?.length || 0,
          metadata: data.metadata
        });

        // Ensure the data has the expected structure
        if (!data.items) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }

        // Check if the PIT was reset by the server
        if (data.metadata?.pitReset) {
          console.log('Server reset the PIT, updating stored PIT ID');
          firstPagePitIdRef.current = data.metadata.pitId;
          savePitIdToStorage(queryValue, data.metadata.pitId);
        }
        // Store the PIT ID from the first page response
        else if (currentPage === 1 && data.metadata?.pitId) {
          console.log('Storing PIT ID from first page:', data.metadata.pitId);
          firstPagePitIdRef.current = data.metadata.pitId;
          savePitIdToStorage(queryValue, data.metadata.pitId);
        }

        return data;
      } catch (error) {
        console.error('Error in useMediaSearch:', error);

        // If the error is PIT-related, reset the stored PIT ID
        if (isPitError(error)) {
          console.log('PIT-related error detected, resetting stored PIT ID');
          firstPagePitIdRef.current = null;
          removePitIdFromStorage(queryValue);
        }

        throw error;
      }
    },

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      // Check if there are more pages
      if (!lastPage.hasMore) {
        console.log('No more pages to fetch (hasMore is false)');
        return undefined;
      }

      // Double-check if we've loaded all items
      // This is a safety check in case the server's hasMore flag is incorrect
      if (lastPage.items.length < lastPage.total) {
        // Make sure we have the required metadata for pagination
        if (!lastPage.metadata || !lastPage.metadata.pitId || !lastPage.metadata.searchAfter) {
          console.error('Missing pagination metadata:', lastPage.metadata);
          return undefined;
        }

        // Calculate the next page number
        const nextPage = (lastPage.page || 1) + 1;

        // Return the pagination metadata for the next page
        console.log('Next page params:', {
          pitId: lastPage.metadata.pitId,
          searchAfter: lastPage.metadata.searchAfter,
          currentPage: lastPage.page,
          nextPage: nextPage,
          loadedItems: lastPage.items.length,
          total: lastPage.total
        });

        return {
          pitId: lastPage.metadata.pitId,
          searchAfter: lastPage.metadata.searchAfter,
          page: nextPage
        };
      } else {
        console.log('All items loaded, no more pages to fetch');
        return undefined;
      }
    },

    // Reset pages when the query changes
    refetchOnMount: true,
    refetchOnWindowFocus: false,

    // Add a staleTime to prevent frequent refetching
    staleTime: 1000, // 1 second

    // This ensures that when the query changes, the cache is invalidated
    gcTime: 0
  });
};