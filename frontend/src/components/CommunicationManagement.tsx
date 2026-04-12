import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";

import DataTable from "@/features/documents/ui/DataTable";
import FormDialog from "@/features/documents/ui/FormDialog";
import DeleteDialog from "@/features/documents/ui/DeleteDialog";

import {
  useCreateDocument,
  useDeleteDocument,
  useDocumentFilters,
  useDocuments,
  useUpdateDocument,
} from "@/features/documents/documents.hooks";

import { Document, UpdateDocumentDTO } from "@/features/documents/documents.types";
import EmptyState from "./EmptyState";
import { useDialogState, useManagementKeyboardShortcuts, usePagination } from "@/hooks/useManagementHooks";
import PaginationControls from "./ui/PaginationControls";
import FilterCard from "./ui/FilterCard";

export default function CommunicationManagement() {
  const { user: authUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters state
  const { filters, updateFilters } = useDocumentFilters();
  const [searchDocument, setSearchDocument] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [documentType, setDocumentType] = useState('all');
  const [visibility, setVisibility] = useState('all');

  const debouncedSearch = useDebounce(searchDocument, 500);

  // Data fetching
  const { data, isFetching, isError, error } = useDocuments(filters);

  const documents = data?.documents ?? [];
  const pagination = data?.pagination;

  // Mutations
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  // Dialog state
  const { activeDialog, selectedItem, openDialog, closeDialog } =
    useDialogState<Document>();

  // Keyboard shortcuts
  useManagementKeyboardShortcuts(
    () => openDialog('create'),
    searchInputRef
  );

  // Pagination
  const paginationControls = usePagination(pagination, updateFilters, filters);

  // Apply filters - ONLY reset page when actual filters change (not on every render)
  useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      date_from: dateFrom,
      date_to: dateTo,
      visibility: visibility === 'all' ? '' : visibility,
      document_type: documentType === 'all' ? '' : documentType,
      limit: 10,
      page: 1, // Reset to page 1 ONLY when filters change
    });
  }, [debouncedSearch, dateFrom, dateTo, visibility, documentType, updateFilters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchDocument('');
    setDateFrom('');
    setDateTo('');
    setVisibility('all');
    setDocumentType('all');
  }, []);

  // Get active filters for display
  const activeFilters = useMemo(() => {
    const filters = [];
    
    if (searchDocument) {
      filters.push({
        label: 'Search',
        value: `"${searchDocument}"`,
        color: 'bg-blue-100 text-blue-700',
      });
    }

    if (documentType !== 'all') {
      filters.push({
        label: 'Document Type',
        value: documentType.charAt(0).toUpperCase() + documentType.slice(1),
        color: 'bg-amber-100 text-amber-700',
      });
    }

    if (visibility !== 'all') {
      filters.push({
        label: 'Visibility',
        value: visibility.charAt(0).toUpperCase() + visibility.slice(1),
        color: 'bg-orange-100 text-orange-700',
      });
    }
    
    if (dateFrom) {
      filters.push({
        label: 'From',
        value: dateFrom,
        color: 'bg-purple-100 text-purple-700',
      });
    }
    
    if (dateTo) {
      filters.push({
        label: 'To',
        value: dateTo,
        color: 'bg-green-100 text-green-700',
      });
    }
    
    return filters;
  }, [searchDocument, dateFrom, dateTo, documentType, visibility]);

  // Filter configurations
  const filterConfigs = useMemo(() => [
    {
      id: 'documentType',
      label: 'Document Type',
      value: documentType,
      onChange: setDocumentType,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'agenda', label: 'Agenda' },
        { value: 'session', label: 'Session' },
        { value: 'minutes', label: 'Minutes' },
        { value: 'ordinance', label: 'Ordinance' },
        { value: 'resolution', label: 'Resolution' },
        { value: 'report', label: 'Report' },
        { value: 'forum', label: 'Forum' },
        { value: 'attachment', label: 'Attachment' },
      ],
    },
    {
      id: 'visibility',
      label: 'Visibility',
      value: visibility,
      onChange: setVisibility,
      options: [
        { value: 'all', label: 'All Visibility' },
        { value: 'public', label: 'Public' },
        { value: 'internal', label: 'Internal' },
        { value: 'private', label: 'Private' },
      ],
    },
    {
      id: 'dateFrom',
      label: 'Date From',
      value: dateFrom,
      onChange: setDateFrom,
      type: 'date' as const,
    },
    {
      id: 'dateTo',
      label: 'Date To',
      value: dateTo,
      onChange: setDateTo,
      type: 'date' as const,
    },
  ], [dateFrom, dateTo, documentType, visibility]);

  // CRUD handlers with error handling
  const handleCreate = useCallback(async (data: FormData) => {
    setIsSaving(true);
    try {
      await createDocument.mutateAsync(data);
      // toast.success('Document uploaded successfully');
      closeDialog();
    } catch (err: any) {
      // toast.error(err?.message || 'Failed to upload document');
    }finally{
      setIsSaving(false);
    }
  }, [createDocument, closeDialog]);

  const handleUpdate = useCallback(async (data: FormData) => {
    if (!selectedItem) return;

    setIsSaving(true);
    try {
      const params: UpdateDocumentDTO = {
        id: Number(selectedItem.id),
        payload: data,
      };
      await updateDocument.mutateAsync(params);
      // toast.success('Document updated successfully');
      closeDialog();
    } catch (err: any) {
      // toast.error(err?.message || 'Failed to update document');
    }finally{
      setIsSaving(false);
    }
  }, [selectedItem, updateDocument, closeDialog]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await deleteDocument.mutateAsync(Number(selectedItem.id));
      // toast.success('Document deleted successfully');
      closeDialog();
    } catch (err: any) {
      // toast.error(err?.message || 'Failed to delete document');
    }finally{
      setIsSaving(false);
    }
  }, [selectedItem, deleteDocument, closeDialog]);

  // Check if user can modify
  const canModify = useMemo(
    () => authUser && (authUser.user_type === 'Admin' || authUser.user_type === 'Staff' || authUser.user_type === 'Uploader'),
    [authUser]
  );

  // Error state
  if (isError) {
    return (
      <div className="flex justify-center items-center p-8">
        <EmptyState
          title="Error loading documents"
          description={error?.message || 'Something went wrong'}
          action={
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1
      }}
      transition={{
        delay: 0.1,
        duration: 0.25,
        type: 'tween',
      }}
      className="space-y-4 p-0 sm:p-4"
    >
      {/* Header */}
      <div className="relative flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
        <div className="-top-8 right-0 absolute font-mono text-[11px]">
          <span>New: <strong className="font-extrabold">[Alt + 1]</strong></span>&nbsp; 
          <span>Search: <strong className="font-extrabold">[Ctrl + F]</strong></span>
        </div>
        <div>
          <h1 className="font-medium text-lg">Document Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage PDF Documents</p>
        </div>
        {canModify && (
          <Button
            onClick={() => openDialog('create')}
            className="bg-[#008ea2] hover:bg-[#007a8b] w-full sm:w-auto"
            aria-label="Upload document"
          >
            <Plus className="mr-2 w-4 h-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <FilterCard
        searchValue={searchDocument}
        onSearchChange={setSearchDocument}
        searchPlaceholder="Search by document name, keywords..."
        filters={filterConfigs}
        activeFilters={activeFilters}
        onClearAll={clearAllFilters}
        isLoading={isFetching}
      />

      {/* Documents Table */}
      {documents.length > 0 || isFetching ? (
        <Card
          className={`${isFetching ? "opacity-60 pointer-events-none" : ""} sm:gap-4 gap-2`}
          role="region"
          aria-label="Documents table"
        >
          <CardHeader className="relative">
            {pagination && (
              <div className="flex justify-end items-center">
                <PaginationControls
                  {...paginationControls}
                  onPageChange={paginationControls.handlePageChange}
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="px-3 sm:px-6 sm:[&:last-child]:pb-6 [&:last-child]:pb-0 overflow-x-auto">
            <DataTable
              documents={documents}
              onEdit={(d) => openDialog("edit", d)}
              onDelete={(d) => openDialog("delete", d)}
              onView={(d) => openDialog('view', d)}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No documents found"
          description={
            canModify
              ? "Try adjusting your search or upload a new document to get started."
              : "No documents available."
          }
          action={
            canModify ? (
              <Button onClick={() => openDialog("create")}>
                <Plus className="mr-2 w-4 h-4" />
                Upload Document
              </Button>
            ) : null
          }
        />
      )}

      {/* Dialogs */}
      <FormDialog
        open={activeDialog === 'create' || activeDialog === 'edit' || activeDialog === 'view'}
        onClose={closeDialog}
        onSave={activeDialog === 'create' ? handleCreate : handleUpdate}
        document={selectedItem}
        mode={activeDialog}
        isSaving={isSaving}
      />

      {selectedItem && (
        <DeleteDialog
          open={activeDialog === 'delete'}
          onClose={closeDialog}
          document={selectedItem}
          onConfirm={handleDelete}
          isSaving={isSaving}
        />
      )}
    </motion.div>
  );
}