import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading = false 
}) => {
  const debouncedSearch = useDebouncedCallback((value: string) => {
    onSearch(value)
  }, 300)

  return (
    <div className="flex w-full max-w-2xl items-center space-x-2">
      <Input
        type="text"
        placeholder="Search media..."
        onChange={(e) => debouncedSearch(e.target.value)}
        className="flex-1"
      />
      <Button 
        variant="outline"
        size="icon"
        disabled={isLoading}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}