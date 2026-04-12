import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, FileText, Calendar, Users, Building2, Tag, ChevronRight, X, Loader2 } from 'lucide-react';
import Navigation from '../components/layouts/Navigation';
import {
  fetchCommunications,
  fetchCommunicationsFilters,
} from '../api/public-pages-api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { handleDocumentPublicDownload } from '@/lib/utils';

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
  update_by: string ;
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
  id: number;
  name?: string;
  label?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-700 border-blue-200',
  RELEASED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  PULLED_OUT: 'bg-teal-100 text-teal-700 border-teal-200',
};

const getStatusColor = (stageName: string): string =>
  STATUS_COLORS[stageName] ?? 'bg-gray-100 text-gray-700 border-gray-200';

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  per_page: 10,
  total: 0,
  total_pages: 0,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DocBadgeProps {
  docId: string | null;
  label: string;
  colorClass: string;
  downloadKey: string;
  downloadingId: string | null;
  onDownload: (docId: string, key: string) => void;
}

const DocBadge = ({
  docId,
  label,
  colorClass,
  downloadKey,
  downloadingId,
  onDownload,
}: DocBadgeProps) => {
  if (!docId) return null;

  const key = `${downloadKey}-${docId}`;
  const isLoading = downloadingId === key;

  return (
    <Button
      variant="link"
      className="m-0 p-0 w-auto"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDownload(docId, key);
      }}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="mr-1 w-4 h-4 animate-spin" />}
      <span className={`px-2 py-1 rounded-full font-semibold text-xs ${colorClass}`}>
        {label}
      </span>
    </Button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  // List state
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [communicationTypeFilter, setCommunicationTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Filter options
  const [communicationTypes, setCommunicationTypes] = useState<FilterOption[]>([]);
  const [statuses, setStatuses] = useState<FilterOption[]>([]);
  
  // Detail / modal state
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [categoriesRes, stagesRes, termsRes] = await Promise.all([
          fetchCategories(),
          fetchStages(),
          fetchTerms(),
        ]);
        if (categoriesRes.success) setCategories(categoriesRes.categories);
        if (stagesRes.success) setStages(stagesRes.stages);
        if (termsRes.success) setTerms(termsRes.terms);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilters();

    window.scrollTo(0, 0);
  }, []);

  // Single effect: fetch resolutions whenever page or any filter/search changes.
  // Page resets are handled inline in the handlers below (same render batch),
  // so this effect only ever fires once per user action.
  useEffect(() => {
    const loadResolutions = async () => {
      try {
        setLoading(true);
        const response = await fetchResolutions({
          page: pagination.current_page,
          limit: pagination.per_page,
          category: categoryFilter || undefined,
          stage: stageFilter || undefined,
          term: termFilter || undefined,
          search: debouncedSearch || undefined,
        });
        if (response.success) {
          setResolutions(response.resolutions);
          setPagination(response.pagination);
        }
      } catch (error) {
        console.error('Failed to load resolutions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current_page, debouncedSearch, categoryFilter, stageFilter, termFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSelectResolution = useCallback(async (resolution: Resolution) => {
    setSelectedResolution(resolution);
    setAuthors([]);
    setCommittees([]);
    try {
      const [authorsRes, committeesRes] = await Promise.all([
        fetchResolutionAuthors(resolution.id),
        fetchResolutionCommittees(resolution.id),
      ]);
      if (authorsRes.success) setAuthors(authorsRes.authors);
      if (committeesRes.success) setCommittees(committeesRes.sponsorships);
    } catch (error) {
      console.error('Failed to load resolution details:', error);
    }
  }, []);

  const handleDownload = useCallback(async (docId: string, key: string) => {
    setDownloadingId(key);
    try {
      await handleDocumentPublicDownload(docId);
    } finally {
      setDownloadingId(null);
    }
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

  // Reset page to 1 alongside the filter change so both land in the same render,
  // preventing the fetch effect from firing twice.
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, []);

  const handleStageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStageFilter(e.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, []);

  const handleTermChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTermFilter(e.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navigation showLoginButton={true} />

      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="mx-auto px-4 sm:px-6 py-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-4 font-bold text-4xl md:text-5xl">Resolutions</h1>
            <p className="mb-8 max-w-3xl text-emerald-100 text-lg">
              Explore all council resolutions, approval records, and legislative actions
            </p>

            {/* Search bar */}
            <div className="flex sm:flex-row flex-col items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="top-1/2 left-4 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search by resolution number or title..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="bg-white py-6 pl-12 border-white/20 text-gray-900"
                />
              </div>
              <Button
                onClick={() => setShowFilters((v) => !v)}
                className="bg-white/10 hover:bg-white/20 border border-white/30 w-full sm:w-auto"
                size="lg"
              >
                <Filter className="mr-2 w-5 h-5" />
                Filters
              </Button>
            </div>

            {/* Advanced filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'tween' }}
                  className="bg-white/10 backdrop-blur-sm mt-4 p-6 rounded-lg"
                >
                  <div className="gap-4 grid md:grid-cols-3">
                    {/* Category */}
                    <div>
                      <label className="block mb-2 font-medium text-sm">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={handleCategoryChange}
                        className="bg-white/20 px-4 py-2 border border-white/30 rounded-lg w-full text-white"
                      >
                        <option value="" className="text-gray-900">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="text-gray-900">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stage */}
                    <div>
                      <label className="block mb-2 font-medium text-sm">Stage</label>
                      <select
                        value={stageFilter}
                        onChange={handleStageChange}
                        className="bg-white/20 px-4 py-2 border border-white/30 rounded-lg w-full text-white"
                      >
                        <option value="" className="text-gray-900">All Stages</option>
                        {stages.map((stage) => (
                          <option key={stage.id} value={stage.id} className="text-gray-900">
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Term */}
                    <div>
                      <label className="block mb-2 font-medium text-sm">Term</label>
                      <select
                        value={termFilter}
                        onChange={handleTermChange}
                        className="bg-white/20 px-4 py-2 border border-white/30 rounded-lg w-full text-white"
                      >
                        <option value="" className="text-gray-900">All Terms</option>
                        {terms.map((term) => (
                          <option key={term.id} value={term.id} className="text-gray-900">
                            {term.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto px-4 sm:px-6 py-12 max-w-7xl">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="border-emerald-600 border-b-2 rounded-full w-12 h-12 animate-spin" />
          </div>
        ) : resolutions.length === 0 ? (
          <div className="bg-white shadow-sm p-12 rounded-xl text-center">
            <p className="text-gray-500 text-lg">No resolutions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resolutions.map((resolution, index) => (
              <motion.article
                key={resolution.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelectResolution(resolution)}
                className={`bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all cursor-pointer border-l-4 ${
                  resolution.is_published ? 'border-emerald-500' : 'border-gray-300'
                } ${selectedResolution?.id === resolution.id ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-emerald-600 text-lg">
                        {resolution.resolution_number}
                      </span>
                      <span className="flex items-center px-2 border rounded-full font-semibold text-xs">
                        <Calendar className="mr-1 w-4 h-4" />
                        Approved: {formatDate(resolution.date_approved)}
                      </span>
                      <DocBadge
                        docId={resolution.document_id}
                        docNumber={resolution.document_number}
                        visibility={resolution.document_visibility}
                        published={resolution.document_published}
                        label="Document #"
                        colorClass="bg-blue-100 text-blue-700"
                        downloadKey={`doc-${resolution.id}`}
                        downloadingId={downloadingId}
                        onDownload={handleDownload}
                      />
                      <DocBadge
                        docId={resolution.committee_report_id}
                        docNumber={resolution.committee_report_number}
                        visibility={resolution.committee_report_visibility}
                        published={resolution.committee_report_published}
                        label="Committee Report #"
                        colorClass="bg-teal-100 text-teal-700"
                        downloadKey={`report-${resolution.id}`}
                        downloadingId={downloadingId}
                        onDownload={handleDownload}
                      />
                    </div>
                    <h3 className="mb-2 font-semibold text-gray-900 break-words whitespace-normal">
                      {resolution.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-gray-600 text-sm">
                      <span className="flex items-center">
                        <Tag className="mr-1 w-4 h-4" />
                        {resolution.category_name}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="mr-1 w-4 h-4" />
                        Filed: {formatDate(resolution.date_filed)}
                      </span>
                      <span className="text-gray-500">{resolution.term_label}</span>
                    </div>
                  </div>
                  <ChevronRight className="flex-shrink-0 mt-1 w-5 h-5 text-gray-400" />
                </div>
              </motion.article>
            ))}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  onClick={handlePreviousPage}
                  disabled={pagination.current_page === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-gray-600">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={pagination.current_page === pagination.total_pages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedResolution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedResolution(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col bg-white shadow-2xl mx-3 p-0 rounded-2xl w-full max-w-3xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="top-0 z-10 sticky flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-600 p-3 sm:p-6 border-gray-200 border-b rounded-t-xl text-white">
                <div>
                  <h3 className="mb-2 font-bold text-xl">Resolution Details</h3>
                  <p className="text-emerald-100 text-sm">{selectedResolution.resolution_number}</p>
                </div>
                <button
                  onClick={() => setSelectedResolution(null)}
                  className="hover:bg-white/10 p-2 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal body */}
              <div className="overflow-y-auto scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                <div className="space-y-6 p-3 sm:p-6">

                  {/* Documents */}
                  {(
                    (selectedResolution.document_id && selectedResolution.document_published && selectedResolution.document_visibility === 'public') ||
                    (selectedResolution.committee_report_id && selectedResolution.committee_report_published && selectedResolution.committee_report_visibility === 'public')
                  ) && (
                    <div>
                      <h4 className="mb-3 pl-2 border-emerald-600 border-l-8 font-semibold text-gray-900">
                        Documents
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedResolution.document_id &&
                          selectedResolution.document_published &&
                          selectedResolution.document_visibility === 'public' ? (
                            <button
                              onClick={() =>
                                handleDownload(
                                  selectedResolution.document_id!,
                                  `modal-doc-${selectedResolution.id}`
                                )
                              }
                              disabled={downloadingId === `modal-doc-${selectedResolution.id}`}
                              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 px-4 py-2 border border-blue-200 rounded-lg text-blue-800 text-sm transition-colors"
                            >
                              {downloadingId === `modal-doc-${selectedResolution.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <span>
                                <span className="font-semibold">Document</span>
                                {selectedResolution.document_number && (
                                  <span className="ml-1 text-blue-600 text-xs">
                                    #{selectedResolution.document_number}
                                  </span>
                                )}
                              </span>
                            </button>
                          ) : <></>}

                        {(selectedResolution.committee_report_id && Number(selectedResolution.committee_report_id) > 0) &&
                          selectedResolution.committee_report_published &&
                          selectedResolution.committee_report_visibility === 'public' ? (
                            <button
                              onClick={() =>
                                handleDownload(
                                  selectedResolution.committee_report_id!,
                                  `modal-report-${selectedResolution.id}`
                                )
                              }
                              disabled={downloadingId === `modal-report-${selectedResolution.id}`}
                              className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 disabled:opacity-60 px-4 py-2 border border-teal-200 rounded-lg text-teal-800 text-sm transition-colors"
                            >
                              {downloadingId === `modal-report-${selectedResolution.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              <span>
                                <span className="font-semibold">Committee Report</span>
                                {selectedResolution.committee_report_number && (
                                  <span className="ml-1 text-teal-600 text-xs">
                                    #{selectedResolution.committee_report_number} MIT
                                  </span>
                                )}
                              </span>
                            </button>
                          ) : <></>}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h4 className="mb-3 pl-2 border-emerald-600 border-l-8 font-semibold text-gray-900">
                      Legislative Timeline
                    </h4>
                    <div className="space-y-3">
                      {selectedResolution.date_filed && (
                        <div className="flex items-center text-sm">
                          <div className="bg-blue-500 mr-3 rounded-full w-2 h-2 shrink-0" />
                          <span className="text-gray-600">Filed:</span>
                          <span className="ml-auto font-medium">
                            {formatDate(selectedResolution.date_filed)}
                          </span>
                        </div>
                      )}
                      {selectedResolution.date_adopted && (
                        <div className="flex items-center text-sm">
                          <div className="bg-green-500 mr-3 rounded-full w-2 h-2 shrink-0" />
                          <span className="text-gray-600">Adopted:</span>
                          <span className="ml-auto font-medium">
                            {formatDate(selectedResolution.date_adopted)}
                          </span>
                        </div>
                      )}
                      {selectedResolution.date_approved && (
                        <div className="flex items-center text-sm">
                          <div className="bg-emerald-500 mr-3 rounded-full w-2 h-2 shrink-0" />
                          <span className="text-gray-600">Approved:</span>
                          <span className="ml-auto font-medium">
                            {formatDate(selectedResolution.date_approved)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Authors */}
                  {authors.length > 0 && (
                    <div>
                      <h4 className="flex items-center mb-3 pl-2 border-emerald-600 border-l-8 font-semibold text-gray-900">
                        <Users className="mr-2 w-5 h-5" />
                        Author &amp; Co-authors ({authors.length})
                      </h4>
                      <div className="space-y-2">
                        {authors.map((author) => (
                          <div
                            key={author.id}
                            className="flex justify-between items-center bg-gray-50 p-2 rounded"
                          >
                            <span className="font-medium text-gray-900 text-sm">
                              {author.member_name}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                author.role === 'Author'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {author.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Committees */}
                  {committees.length > 0 && (
                    <div>
                      <h4 className="flex items-center mb-3 pl-2 border-emerald-600 border-l-8 font-semibold text-gray-900">
                        <Building2 className="mr-2 w-5 h-5" />
                        Sponsoring Committees ({committees.length})
                      </h4>
                      <div
                        className="space-y-2 max-h-64 overflow-y-auto"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {committees.map((committee) => (
                          <div
                            key={committee.id}
                            className="bg-teal-50 p-3 border border-teal-200 rounded-lg"
                          >
                            <p className="font-medium text-teal-900 text-sm">
                              {committee.committee_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {selectedResolution.remarks && (
                    <div>
                      <h4 className="mb-2 pl-2 border-emerald-600 border-l-8 font-semibold text-gray-900">
                        Remarks
                      </h4>
                      <p className="text-gray-700 text-sm whitespace-pre-line">
                        {selectedResolution.remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pt-4 pb-2 border-gray-200 border-t">
                <div className="flex flex-wrap items-center gap-2">&nbsp;</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}