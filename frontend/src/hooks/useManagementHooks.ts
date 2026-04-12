import { useEffect, useCallback, RefObject, useState } from 'react';
import { useDebounce } from './useDebounce';
import { Pagination } from '@/types/types';

/**
 * Hook for managing keyboard shortcuts in management pages
 * @param onNew - Callback for creating new items (Alt+1)
 * @param searchRef - Reference to search input for focus (Ctrl+F)
 */
export function useManagementKeyboardShortcuts(
  onNew: () => void,
  searchRef: RefObject<HTMLInputElement>
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+1 to open create dialog
      if (event.altKey && event.key === '1') {
        event.preventDefault();
        onNew();
      }

      // Ctrl+F to focus search
      if (event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNew, searchRef]);
}

/**
 * Hook for managing pagination
 * @param pagination - Current pagination state
 * @param updateFilters - Function to update filters with new page
 */
export function usePagination(
  pagination: Pagination | undefined,
  updateFilters: (filters: any) => void,
  currentFilters: any = {}   // ← add this
) {
  const handlePageChange = useCallback(
    (page: number) => {
      if (!pagination) return;
      if (page >= 1 && page <= pagination.total_pages) {
        updateFilters({ ...currentFilters, page }); // ← spread existing
      }
    },
    [pagination, updateFilters, currentFilters]
  );

  const canGoPrevious = pagination ? pagination.current_page > 1 : false;
  const canGoNext = pagination
    ? pagination.current_page < pagination.total_pages
    : false;

  return {
    handlePageChange,
    canGoPrevious,
    canGoNext,
    currentPage: pagination?.current_page ?? 1,
    totalPages: pagination?.total_pages ?? 1,
    totalRecords: pagination?.total ?? 0,
  };
}

/**
 * Hook for managing dialog state
 */
export function useDialogState<T>() {
  const [activeDialog, setActiveDialog] = useState<
    'view' | 'create' | 'edit' | 'delete' | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const openDialog = useCallback(
    (type: 'view' | 'create' | 'edit' | 'delete', item: T | null = null) => {
      setSelectedItem(item);
      setActiveDialog(type);
    },
    []
  );

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setTimeout(() => setSelectedItem(null), 150);
  }, []);

  return {
    activeDialog,
    selectedItem,
    openDialog,
    closeDialog,
  };
}

/**
 * Hook for managing search with debounce
 * @param updateFilters - Function to update filters
 * @param debounceMs - Debounce delay in milliseconds
 */
export function useDebouncedSearch(
  updateFilters: (filters: any) => void,
  debounceMs: number = 500
) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, debounceMs);

  useEffect(() => {
    updateFilters({ search: debouncedSearch });
  }, [debouncedSearch, updateFilters]);

  return { searchTerm, setSearchTerm };
}

/**
 * Hook for managing cursor position in input fields
 */
export function useInputCursorPosition() {
  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      setValue: (value: string) => void
    ) => {
      const target = e.target;
      const cursorPosition = target.selectionStart;
      setValue(e.target.value);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (target && cursorPosition !== null) {
          target.setSelectionRange(cursorPosition, cursorPosition);
        }
      });
    },
    []
  );

  return { handleInputChange };
}