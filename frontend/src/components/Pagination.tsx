import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [25, 50, 100],
  itemName = 'items',
  className = ''
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className={`border-t border-white/60 bg-white/40 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${className}`}>
      {/* Left side: Item count summary & per-page selector */}
      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium flex-wrap justify-center sm:justify-start">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-semibold">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 bg-white/80 border border-white/90 rounded-lg text-xs font-bold text-gray-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {itemsPerPageOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-gray-400">per page</span>
          </div>
        )}

        <div className="text-gray-600 font-semibold">
          Showing <span className="text-gray-900 font-bold">{startItem}</span> to <span className="text-gray-900 font-bold">{endItem}</span> of <span className="text-gray-900 font-bold">{totalItems}</span> {itemName}
          {totalPages > 1 && (
            <span className="text-gray-400 font-normal ml-1.5">
              (Page {safeCurrentPage} of {totalPages})
            </span>
          )}
        </div>
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          title="First Page"
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-white/80 bg-white/70 text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          title="Previous Page"
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-white/80 bg-white/70 text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 mx-0.5">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="w-6 sm:w-7 text-center text-xs text-gray-400 select-none font-bold">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isActive = pageNum === safeCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white border border-primary/20 shadow-primary/20'
                    : 'border border-white/80 bg-white/70 text-gray-700 hover:bg-white hover:text-gray-900'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages || totalItems === 0}
          title="Next Page"
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-white/80 bg-white/70 text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages || totalItems === 0}
          title="Last Page"
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-white/80 bg-white/70 text-gray-500 hover:text-gray-800 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
