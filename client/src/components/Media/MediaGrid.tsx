import React, { useState, useEffect } from "react";
import { useMediaSearch } from "@/hooks/useMediaSearch";
import { MediaCard } from "../Media/MediaCard";
import { SearchBar } from "../SearchBar/SearchBar";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import type { MediaItem } from "@/types/media.types";

export function MediaGrid() {
  const [searchParams, setSearchParams] = useState({
    limit: 50,
    query: "",
  });

  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: "0px 0px 200px 0px", // Load more when 200px from bottom
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    refetch,
  } = useMediaSearch(searchParams);

  // Flatten the pages of items into a single array
  const items = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items || []);
  }, [data?.pages]);

  // Calculate total and current page information
  // Get the total from the first page's response
  const totalItems = data?.pages?.[0]?.total || 0;

  // Get the current page from the last page's response
  // This will now correctly reflect the page number from the server
  const currentPage =
    data?.pages?.length > 0 ? data.pages[data.pages.length - 1]?.page || 1 : 1;

  // Count the total number of items loaded so far
  const loadedItems = items.length;

  // Calculate the number of pages based on the total and limit
  const totalPages = Math.ceil(totalItems / searchParams.limit);

  // Log pagination information for debugging
  useEffect(() => {
    if (data?.pages) {
      console.log("Pagination info:", {
        totalItems,
        currentPage,
        loadedItems,
        pagesCount: data.pages.length,
        firstPageTotal: data.pages[0]?.total,
        lastPageNumber: data.pages[data.pages.length - 1]?.page,
        allPages: data.pages.map((page) => ({
          total: page.total,
          page: page.page,
        })),
      });
    }
  }, [data?.pages, totalItems, currentPage, loadedItems]);

  // Fetch next page when the load more element comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log("Loading next page...");
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage]);

  const handleSearch = (query: string) => {
    console.log("Search query:", query);

    // Validate and clean the query
    const cleanedQuery = query.trim();

    // Only search if query is empty (reset) or at least 3 characters
    if (cleanedQuery === "" || cleanedQuery.length >= 3) {
      // Reset search params with the new query
      setSearchParams((prev) => {
        // Only update if the query has changed
        if (prev.query !== cleanedQuery) {
          console.log("Updating search params with query:", cleanedQuery);
          return { ...prev, query: cleanedQuery };
        }
        return prev;
      });
    }
  };

  if (isError) {
    console.error("Error fetching media:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-center">
          <SearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            initialValue={searchParams.query}
          />
        </div>
        <div className="text-center text-red-500">
          Error loading media. Please try again.
          {error instanceof Error && (
            <div className="mt-2 text-sm whitespace-pre-wrap">
              {error.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-center">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          initialValue={searchParams.query}
        />
      </div>

      {/* Display total count and current page information */}
      {items.length > 0 && (
        <div className="mb-4 text-center text-sm text-muted-foreground">
          {loadedItems >= totalItems
            ? // If we've loaded all items, show a simpler message
              `Showing all ${loadedItems} items`
            : // Otherwise show the pagination info
              `Showing ${loadedItems} of ${totalItems} items (Page ${currentPage} of ${
                totalPages || "?"
              })`}
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item, index) => (
              <MediaCard
                key={`${item.bildnummer || item.id}-${index}`}
                item={item}
                onSelect={(item) => console.log("Selected:", item)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div ref={ref} className="flex justify-center mt-8 py-4">
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin" />
              )}
              {!isFetchingNextPage && (
                <span className="text-sm text-muted-foreground">
                  Scroll for more
                </span>
              )}
            </div>
          )}

          {!hasNextPage && items.length > 0 && (
            <p className="text-center mt-8 text-muted-foreground">
              No more items to load
            </p>
          )}

          {items.length === 0 && !isLoading && (
            <p className="text-center mt-8 text-muted-foreground">
              No results found
            </p>
          )}
        </>
      )}
    </div>
  );
}
