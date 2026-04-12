import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  canGoPrevious,
  canGoNext,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>
        Page {currentPage} of {totalPages} — <strong>{totalRecords}</strong>{' '}
        records
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        className={`w-6 h-6 ${
          !canGoPrevious
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-gray-100 rounded'
        }`}
        aria-label="Previous page"
        aria-disabled={!canGoPrevious}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={`w-6 h-6 ${
          !canGoNext
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-gray-100 rounded'
        }`}
        aria-label="Next page"
        aria-disabled={!canGoNext}
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}