import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialValue?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading = false,
  initialValue = "",
}) => {
  const [value, setValue] = useState(initialValue);

  // Update local state when initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    // Validate and clean the input before passing it to the search handler
    onSearch(value);
  }, 500);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-2xl items-center space-x-2"
    >
      <Input
        type="text"
        placeholder="Search media..."
        value={value}
        onChange={handleChange}
        className="flex-1"
      />
      <Button type="submit" variant="outline" size="icon" disabled={isLoading}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
