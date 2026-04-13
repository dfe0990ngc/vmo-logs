import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, FileText, Calendar, ChevronRight, X, Loader2, Download, Eye } from 'lucide-react';
import Navigation from './layouts/Navigation';
import {
  fetchCommunications,
  fetchCommunicationsFilters,
} from '../api/public-pages-api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { triggerCommunicationPublicDownload } from '@/features/communications/communications.api';
import { formatDateTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Communication {
  id: string;
  title: string;
  communication_type: string;
  status: string;
  reference_no: string;
  date_received: string;
  date_logged: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_by: string;
  created_by_name: string;
  updated_by: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface FilterOption {
  id: string;
  name: string;
  label: string;
}

interface FilterOptions {
  types: FilterOption[];
  statuses: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  RELEASED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  PULLED_OUT: 'bg-teal-100 text-teal-700 border-teal-200',
};

const getStatusColor = (status: string): string =>
  STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  total_pages: 0,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [communicationTypeFilter, setCommunicationTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    types: COMMUNICATION_TYPES,
    statuses: ['RECEIVED', 'RELEASED', 'COMPLETED', 'PULLED_OUT'],
  });

  // Modal state
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);

  // Download loading state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 300);

  const hasActiveFilters =
    communicationTypeFilter || statusFilter || dateFrom || dateTo;

  const resetPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setCommunicationTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    resetPage();
  }, [resetPage]);

  // Download handler
  const handleDownload = useCallback(async (comm: Communication, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!comm.file_path) return;
    setDownloadingId(comm.id);
    try {
      await triggerCommunicationPublicDownload(Number(comm.id));
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // View handler
  const handleView = useCallback(async (comm: Communication, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!comm.file_path) return;
    setDownloadingId(comm.id);
    try {
      await triggerCommunicationPublicDownload(Number(comm.id));
    } catch (error) {
      console.error('View failed:', error);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Fetch communications
  useEffect(() => {
    const loadCommunications = async () => {
      try {
        setLoading(true);
        const response = await fetchCommunications({
          page: pagination.current_page,
          limit: pagination.per_page,
          search: debouncedSearch || undefined,
          communication_type: communicationTypeFilter || undefined,
          status: statusFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });

        if (response.success) {
          setCommunications(response.data || []);
          setPagination({
            current_page: response.pagination?.current_page || 1,
            per_page: response.pagination?.per_page || 10,
            total: response.pagination?.total || 0,
            total_pages: response.pagination?.total_pages || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load communications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommunications();
  }, [pagination.current_page, debouncedSearch, communicationTypeFilter, statusFilter, dateFrom, dateTo]);

  // Fetch filter options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await fetchCommunicationsFilters();
        if (response.success) {
          setFilters({
            types: response.communication_types || COMMUNICATION_TYPES,
            statuses: response.statuses || ['RECEIVED', 'RELEASED', 'COMPLETED', 'PULLED_OUT'],
          });
        } else {
          setFilters({
            types: COMMUNICATION_TYPES,
            statuses: ['RECEIVED', 'RELEASED', 'COMPLETED', 'PULLED_OUT'],
          });
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
        setFilters({
          types: COMMUNICATION_TYPES,
          statuses: ['RECEIVED', 'RELEASED', 'COMPLETED', 'PULLED_OUT'],
        });
      }
    };

    loadFilters();
    window.scrollTo(0, 0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      current_page: Math.max(1, prev.current_page - 1),
    }));
  }, []);

  const handleNextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      current_page: Math.min(prev.total_pages, prev.current_page + 1),
    }));
  }, []);

  const handleCommunicationTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCommunicationTypeFilter(e.target.value);
    resetPage();
  }, [resetPage]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    resetPage();
  }, [resetPage]);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    resetPage();
  }, [resetPage]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    resetPage();
  }, [resetPage]);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Navigation showLoginButton={true} />

      <main className="flex-1 mx-auto px-4 sm:px-6 py-8 w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">Communications</h1>
          <p className="text-gray-600">Browse and search all communications</p>
        </div>

        {/* Search + Filter toggle row */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="top-3 left-3 absolute w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search communications..."
              className="pl-10 border-gray-300 focus:border-[#008ea2] focus:ring-[#008ea2]"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                resetPage();
              }}
            />
          </div>
          <Button
            variant="outline"
            className={`border-gray-300 shrink-0 gap-2 ${showFilters ? 'bg-gray-100' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="flex justify-center items-center bg-[#008ea2] rounded-full w-5 h-5 font-semibold text-white text-xs">
                {[communicationTypeFilter, statusFilter, dateFrom || dateTo]
                  .filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Collapsible filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 bg-white mb-4 p-4 border border-gray-200 rounded-xl">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-700 text-sm">Filter options</p>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearAllFilters}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-xs"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>

                {/* Type + Status */}
                <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-gray-500 text-xs">Type</label>
                    <select
                      value={communicationTypeFilter}
                      onChange={handleCommunicationTypeChange}
                      className="bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#008ea2] focus:ring-2 w-full text-sm"
                    >
                      <option value="">All Types</option>
                      {filters.types.map((filter) => (
                        <option key={filter.id} value={filter.name}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-500 text-xs">Status</label>
                    <select
                      value={statusFilter}
                      onChange={handleStatusChange}
                      className="bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#008ea2] focus:ring-2 w-full text-sm"
                    >
                      <option value="">All Statuses</option>
                      {filters.statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="block mb-1 text-gray-500 text-xs">Date received — range</label>
                  <div className="flex sm:flex-row flex-col items-start sm:items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={handleDateFromChange}
                      className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#008ea2] focus:ring-2 w-full sm:w-auto text-sm"
                    />
                    <span className="hidden sm:block text-gray-400 text-sm">to</span>
                    <span className="sm:hidden text-gray-400 text-xs">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={handleDateToChange}
                      className="flex-1 bg-white px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#008ea2] focus:ring-2 w-full sm:w-auto text-sm"
                    />
                    {(dateFrom || dateTo) && (
                      <button
                        onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-xs whitespace-nowrap"
                      >
                        <X className="w-3 h-3" />
                        Clear dates
                      </button>
                    )}
                  </div>
                </div>

                {/* Active filter chips */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2 pt-1 border-gray-100 border-t">
                    {communicationTypeFilter && (
                      <span className="inline-flex items-center gap-1 bg-purple-50 px-2.5 py-1 border border-purple-200 rounded-full font-medium text-purple-700 text-xs">
                        {filters.types.find((t) => t.name === communicationTypeFilter)?.label || communicationTypeFilter}
                        <button onClick={() => { setCommunicationTypeFilter(''); resetPage(); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {statusFilter && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 border border-blue-200 rounded-full font-medium text-blue-700 text-xs">
                        {statusFilter.replace(/_/g, ' ')}
                        <button onClick={() => { setStatusFilter(''); resetPage(); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {(dateFrom || dateTo) && (
                      <span className="inline-flex items-center gap-1 bg-teal-50 px-2.5 py-1 border border-teal-200 rounded-full font-medium text-teal-700 text-xs">
                        <Calendar className="w-3 h-3" />
                        {dateFrom || '…'} – {dateTo || '…'}
                        <button onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Communications List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="mr-2 w-6 h-6 text-[#008ea2] animate-spin" />
            <span className="text-gray-600">Loading communications...</span>
          </div>
        ) : communications.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
            <h3 className="mb-2 font-semibold text-gray-900">No communications found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
            {hasActiveFilters && (
              <Button
                variant="link"
                onClick={handleClearAllFilters}
                className="mt-2 text-[#008ea2]"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Result count */}
            <p className="mb-3 text-gray-500 text-sm">
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
              {debouncedSearch && <> for "<span className="font-medium text-gray-700">{debouncedSearch}</span>"</>}
            </p>

            <div className="space-y-3">
              {communications.map((communication, index) => (
                <motion.article
                  key={communication.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedCommunication(communication)}
                  className="flex justify-between items-start gap-4 bg-white hover:shadow-md p-4 border border-gray-200 rounded-xl transition-shadow cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full font-semibold text-xs border ${getStatusColor(communication.status)}`}>
                        {communication.status.replace(/_/g, ' ')}
                      </span>
                      <span className="bg-purple-100 px-2 py-1 border border-purple-200 rounded-full font-semibold text-purple-700 text-xs">
                        {communication.communication_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="mb-2 font-semibold text-gray-900 text-sm sm:text-base break-words whitespace-normal">
                      {communication.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {communication.reference_no}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTime(communication.date_received)}
                      </span>
                      {communication.created_by_name && (
                        <span className="text-gray-400 text-xs">
                          by {communication.created_by_name}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {communication.file_path && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-[#008ea2] border-[#008ea2] h-8 text-[#008ea2] hover:text-white text-xs"
                          disabled={downloadingId === communication.id}
                          onClick={(e) => handleView(communication, e)}
                        >
                          {downloadingId === communication.id ? (
                            <Loader2 className="mr-1 w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="mr-1 w-3.5 h-3.5" />
                          )}
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:bg-gray-100 border-gray-300 h-8 text-gray-700 text-xs"
                          disabled={downloadingId === communication.id}
                          onClick={(e) => handleDownload(communication, e)}
                        >
                          {downloadingId === communication.id ? (
                            <Loader2 className="mr-1 w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="mr-1 w-3.5 h-3.5" />
                          )}
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="flex-shrink-0 mt-1 w-5 h-5 text-gray-400" />
                </motion.article>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  onClick={handlePreviousPage}
                  disabled={pagination.current_page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="px-3 py-1.5 text-gray-600 text-sm">
                  {pagination.current_page} / {pagination.total_pages}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={pagination.current_page === pagination.total_pages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCommunication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedCommunication(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col bg-white shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-center bg-gradient-to-r from-[#008ea2] to-[#007a8b] p-4 sm:p-6 rounded-t-2xl text-white">
                <div>
                  <h3 className="font-bold text-lg sm:text-xl">Communication Details</h3>
                  <p className="mt-0.5 text-blue-100 text-xs sm:text-sm">{selectedCommunication.reference_no}</p>
                </div>
                <button
                  onClick={() => setSelectedCommunication(null)}
                  className="hover:bg-white/10 p-2 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal content */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div className="space-y-5">
                  <div>
                    <h2 className="font-bold text-gray-900 text-base sm:text-lg leading-snug">
                      {selectedCommunication.title}
                    </h2>
                  </div>

                  <div className="gap-4 grid grid-cols-2 sm:grid-cols-3">
                    {[
                      { label: 'Reference No.', value: selectedCommunication.reference_no },
                      { label: 'Type', value: selectedCommunication.communication_type.replace(/_/g, ' ') },
                      {
                        label: 'Status',
                        value: null,
                        custom: (
                          <span className={`inline-block px-2 py-1 rounded-full font-semibold text-xs border ${getStatusColor(selectedCommunication.status)}`}>
                            {selectedCommunication.status.replace(/_/g, ' ')}
                          </span>
                        ),
                      },
                      { label: 'Date Received', value: formatDateTime(selectedCommunication.date_received) },
                      { label: 'Date Logged', value: formatDateTime(selectedCommunication.created_at) },
                      { label: 'Created By', value: selectedCommunication.created_by_name },
                      { label: 'Updated At', value: formatDateTime(selectedCommunication.updated_at) },
                      { label: 'Updated By', value: selectedCommunication.updated_by_name },
                    ].map(({ label, value, custom }) => (
                      <div key={label}>
                        <p className="mb-0.5 text-gray-500 text-xs">{label}</p>
                        {custom ?? <p className="font-semibold text-gray-900 text-sm">{value || '—'}</p>}
                      </div>
                    ))}
                  </div>

                  {selectedCommunication.file_path && (
                    <div className="pt-4 border-gray-100 border-t">
                      <p className="mb-1 text-gray-500 text-xs">Attached File</p>
                      <p className="font-medium text-gray-900 text-sm break-all">{selectedCommunication.file_name || selectedCommunication.file_path}</p>
                      {selectedCommunication.file_size > 0 && (
                        <p className="mt-0.5 text-gray-400 text-xs">
                          {(selectedCommunication.file_size / 1024).toFixed(2)} KB
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex justify-end items-center gap-2 bg-gray-50 p-4 sm:p-6 border-gray-200 border-t rounded-b-2xl">
                {selectedCommunication.file_path && (
                  <Button
                    variant="outline"
                    className="hover:bg-[#008ea2] border-[#008ea2] text-[#008ea2] hover:text-white"
                    disabled={downloadingId === selectedCommunication.id}
                    onClick={() => handleView(selectedCommunication)}
                  >
                    {downloadingId === selectedCommunication.id ? (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 w-4 h-4" />
                    )}
                    View File
                  </Button>
                )}
                <Button onClick={() => setSelectedCommunication(null)} variant="outline">
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMUNICATION_TYPES: FilterOption[] = [
  { id: 'MTOP', name: 'MTOP', label: 'MTOP' },
  { id: 'TRAVEL_ORDER', name: 'TRAVEL_ORDER', label: 'Travel Order' },
  { id: 'SB_RESOLUTION', name: 'SB_RESOLUTION', label: 'SB Resolution' },
  { id: 'SB_ORDINANCE', name: 'SB_ORDINANCE', label: 'SB Ordinance' },
  { id: 'APPLICATION_LEAVE', name: 'APPLICATION_LEAVE', label: 'Application Leave' },
  { id: 'MEMO', name: 'MEMO', label: 'Memo' },
  { id: 'NOTICE_HEARING', name: 'NOTICE_HEARING', label: 'Notice Hearing' },
  { id: 'INVITATION', name: 'INVITATION', label: 'Invitation' },
  { id: 'ENDORSEMENT', name: 'ENDORSEMENT', label: 'Endorsement' },
  { id: 'DSSC', name: 'DSSC', label: 'DSSC' },
  { id: 'MADAC', name: 'MADAC', label: 'MADAC' },
  { id: 'DOE', name: 'DOE', label: 'DOE' },
  { id: 'SOLICITATION', name: 'SOLICITATION', label: 'Solicitation' },
  { id: 'TENT_REQUEST', name: 'TENT_REQUEST', label: 'Tent Request' },
  { id: 'OTHER', name: 'OTHER', label: 'Other' },
];