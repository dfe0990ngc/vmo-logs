import { ReactNode, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  type?: 'select' | 'date';
}

interface ActiveFilter {
  label: string;
  value: string;
  color: string;
}

interface FilterCardProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
  isLoading?: boolean;
}

export default function FilterCard({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters = [],
  onClearAll,
  isLoading = false,
}: FilterCardProps) {
  const hasActiveFilters = activeFilters.length > 0;
  const [showFilters, setShowFilters] = useState(true);
  return (
    <Card className="gap-2 shadow-sm">
      <CardContent className="sm:p-4 px-3 pb-1">
        <div className="flex flex-col gap-3">
          {/* Search Input */}
          <div className="relative mt-3 w-full">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-white pl-10 text-xs"
              aria-label="Search"
            />
            {isLoading && (
              <div
                className="top-1/2 right-3 absolute -translate-y-1/2"
                aria-label="Loading"
              >
                <div className="inline-block border-[#008ea2] border-t-2 border-r-2 border-b-transparent border-l-transparent rounded-full w-4 h-4 animate-spin" />
              </div>
            )}
          </div>

          {/* Filter Dropdowns */}
          {filters.length > 0 && (
            <div className={`gap-3 ${!showFilters && 'hidden'} transition-all duration-150 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(filters.length, 4)}`}>
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-1.5">
                  <label
                    htmlFor={filter.id}
                    className="font-medium text-gray-700 text-xs"
                  >
                    {filter.label}
                  </label>
                  {filter.type === 'date' ? (
                    <Input
                      id={filter.id}
                      type="date"
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className="bg-white"
                      aria-label={filter.label}
                    />
                  ) : (
                    <Select
                      value={filter.value} 
                      onValueChange={(value) => filter.onChange(value)}>
                      <SelectTrigger id={'trig-'+filter.id} className="bg-white" aria-label={filter.label}>
                        <SelectValue placeholder={filter.label} />
                      </SelectTrigger>
                      <SelectContent className="bg-white px-3 py-2 border border-gray-300 focus:border-[#008ea2] rounded-md outline-none focus:ring-[#008ea2] focus:ring-1 w-full max-h-60 overflow-y-auto text-sm transition-colors">
                        {filter.options.map((option) => (
                          <SelectItem key={'filter-option-value-'+option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    // <select
                    //   id={filter.id}
                    //   value={filter.value}
                    //   onChange={(e) => filter.onChange(e.target.value)}
                    //   className="bg-white px-3 py-2 border border-gray-300 focus:border-[#008ea2] rounded-md outline-none focus:ring-[#008ea2] focus:ring-1 w-full max-h-60 overflow-y-auto text-sm transition-colors"
                    //   aria-label={filter.label}
                    // >
                    //   {filter.options.map((option) => (
                    //     <option key={option.value} value={option.value}>
                    //       {option.label}
                    //     </option>
                    //   ))}
                    // </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="font-medium text-gray-700 text-xs">
                Active filters:
              </span>
              {activeFilters.map((filter, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-md text-xs ${filter.color}`}
                >
                  {filter.label}: {filter.value}
                </span>
              ))}
              {onClearAll && (
                <button
                  onClick={onClearAll}
                  className="flex items-center gap-1 ml-auto text-[#008ea2] hover:text-[#007a8b] text-xs transition-colors"
                  aria-label="Clear all filters"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className={`flex items-center justify-end py-0 -mt-3 px-3`}>
          <Button variant="link" type="button" className="px-0 text-xs" onClick={() => setShowFilters((prev) => !prev)}>{showFilters ? 'Hide Filters' : 'Show Filters'}</Button>
      </CardFooter>
    </Card>
  );
}