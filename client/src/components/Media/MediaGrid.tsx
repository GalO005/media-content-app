import React, { useState } from 'react'
import { useMediaSearch } from '@/hooks/useMediaSearch'
import { MediaCard } from '../Media/MediaCard'
import { SearchBar } from '../SearchBar/SearchBar'
import { useInView } from 'react-intersection-observer'
import { Loader2 } from 'lucide-react'
import type { MediaItem } from '@/types/media.types'

export function MediaGrid() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [searchParams, setSearchParams] = useState({
    limit: 50,
    query: ''
  })
  
  const { ref, inView } = useInView({threshold: 0.5})
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage
  } = useMediaSearch(searchParams)

  // Update items when new data arrives
  React.useEffect(() => {
    console.log('Data:', data)
    if (data?.items) {
      setItems(prev => [...prev, ...data.items])
    }
  }, [data])

  React.useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  // Reset items when search params change
  React.useEffect(() => {
    setItems([])
  }, [searchParams])

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({ ...prev, query }))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-center">
        <SearchBar 
          onSearch={handleSearch} 
          isLoading={isLoading} 
        />
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <MediaCard 
                key={item.bildnummer} 
                item={item}
                onSelect={(item) => console.log('Selected:', item)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div 
              ref={ref} 
              className="flex justify-center mt-8"
            >
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin" />
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
  )
}