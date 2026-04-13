import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { api } from '../api/client';
import DataTable from '@/features/communications/ui/DataTable';
import FormDialog from '@/features/communications/ui/FormDialog';
import DeleteDialog from '@/features/communications/ui/DeleteDialog';
import { Communication } from '@/features/communications/communications.types';

interface FilterOptions {
  types: string[];
  statuses: string[];
}

interface FormDialogMode {
  mode: 'create' | 'edit' | 'view';
  communication: Communication | null;
}

const defaultTypes = [
  'MTOP',
  'TRAVEL_ORDER',
  'SB_RESOLUTION',
  'SB_ORDINANCE',
  'APPLICATION_LEAVE',
  'MEMO',
  'NOTICE_HEARING',
  'INVITATION',
  'ENDORSEMENT',
  'DSSC',
  'MADAC',
  'DOE',
  'SOLICITATION',
  'TENT_REQUEST',
  'OTHER',
];

const defaultStatuses = [
  'RECEIVED',
  'RELEASED',
  'COMPLETED',
  'PULLED_OUT',
];

export default function CommunicationManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogState, setDialogState] = useState<FormDialogMode>({
    mode: 'create',
    communication: null,
  });
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);

  // Fetch filter options
  const { data: filterOptions } = useQuery<{ success: boolean; data: FilterOptions }>({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const response = await api.get('/api/communications/filter-options');
      return response.data;
    },
    initialData: {
      success: true,
      data: {
        types: defaultTypes,
        statuses: defaultStatuses,
      },
    },
  });

  // Fetch communications
  const { data, isLoading, error } = useQuery({
    queryKey: ['communications', page, debouncedSearch, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/api/communications?${params}`);
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formPayload: FormData) => {
      const response = await api.post('/api/communications', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Communication created successfully');
      // Invalidate all communications queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      // Reset to first page after creation
      setPage(1);
      setIsFormDialogOpen(false);
      resetDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create communication');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formPayload: FormData) => {
      const response = await api.post(
        `/api/communications/${selectedCommunication?.id}`,
        formPayload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Communication updated successfully');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsFormDialogOpen(false);
      resetDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update communication');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/communications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Communication deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsDeleteDialogOpen(false);
      setSelectedCommunication(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete communication');
    },
  });

  const resetDialog = () => {
    setDialogState({ mode: 'create', communication: null });
    setSelectedCommunication(null);
  };

  const handleOpenDialog = (communication?: Communication, mode: 'create' | 'edit' | 'view' = 'create') => {
    if (communication) {
      setSelectedCommunication(communication);
      setDialogState({ mode, communication });
    } else {
      resetDialog();
      setDialogState({ mode: 'create', communication: null });
    }
    setIsFormDialogOpen(true);
  };

  const handleSaveForm = async (formData: FormData) => {
    if (dialogState.mode === 'create') {
      createMutation.mutate(formData);
    } else if (dialogState.mode === 'edit') {
      updateMutation.mutate(formData);
    }
  };

  const handleEdit = (communication: Communication) => {
    handleOpenDialog(communication, 'edit');
  };

  const handleView = (communication: Communication) => {
    handleOpenDialog(communication, 'view');
  };

  const handleDelete = (communication: Communication) => {
    setSelectedCommunication(communication);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedCommunication) {
      deleteMutation.mutate(selectedCommunication.id as any);
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <Card className="bg-red-50 border-red-200 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <AlertCircle className="flex-shrink-0 mt-0.5 w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Communications</h3>
                <p className="mt-1 text-red-700 text-sm">Please try again or contact support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const communications = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Communications Management</h1>
          <p className="mt-1 text-gray-600">Manage Vice Mayor's Office communications and logs</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2 bg-[#008ea2] hover:bg-[#007a8b] w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Communication
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        {[
          { label: 'Total', value: pagination.total, color: 'blue' },
          {
            label: 'Received',
            value: communications.filter((c) => c.status === 'RECEIVED').length,
            color: 'indigo',
          },
          {
            label: 'Released',
            value: communications.filter((c) => c.status === 'RELEASED').length,
            color: 'green',
          },
          {
            label: 'Completed',
            value: communications.filter((c) => c.status === 'COMPLETED').length,
            color: 'purple',
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="mt-1 font-bold text-gray-900 text-2xl">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
            <div>
              <Label className="block mb-2 text-gray-700 text-sm">Search</Label>
              <div className="relative">
                <Search className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by title or reference..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="block mb-2 text-gray-700 text-sm">Type</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">All types</SelectItem>
                  {(filterOptions?.data?.types || defaultTypes).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block mb-2 text-gray-700 text-sm">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">All statuses</SelectItem>
                  {(filterOptions?.data?.statuses || defaultStatuses).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Communications List</CardTitle>
          <CardDescription>Total: {pagination.total} records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="border-[#008ea2] border-b-2 rounded-full w-12 h-12 animate-spin"></div>
            </div>
          ) : communications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 text-lg">No communications found</p>
            </div>
          ) : (
            <>
              <DataTable
                communications={communications}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 mt-6">
                  <p className="text-gray-600 text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum: number;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                      disabled={page === pagination.pages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <FormDialog
        open={isFormDialogOpen}
        onClose={() => {
          setIsFormDialogOpen(false);
          resetDialog();
        }}
        onSave={handleSaveForm}
        communication={dialogState.communication}
        mode={dialogState.mode}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedCommunication(null);
        }}
        communication={selectedCommunication}
        onConfirm={handleConfirmDelete}
        isSaving={deleteMutation.isPending}
      />
    </div>
  );
}
