import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  AlertCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Label } from './ui/label';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { api } from '../api/client';
import { Badge } from './ui/badge';

interface Communication {
  id: number;
  title: string;
  communication_type: string;
  status: string;
  reference_no: string;
  date_received: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface FilterOptions {
  types: string[];
  statuses: string[];
}

const statusColors: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  RELEASED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  PULLED_OUT: 'bg-red-100 text-red-800',
};

const typeColors: Record<string, string> = {
  MTOP: 'bg-indigo-100 text-indigo-800',
  TRAVEL_ORDER: 'bg-cyan-100 text-cyan-800',
  SB_RESOLUTION: 'bg-amber-100 text-amber-800',
  SB_ORDINANCE: 'bg-rose-100 text-rose-800',
  MEMO: 'bg-slate-100 text-slate-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    communication_type: 'OTHER',
    status: 'RECEIVED',
    reference_no: '',
    date_received: new Date().toISOString().split('T')[0],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch filter options
  const { data: filterOptions } = useQuery<{ success: boolean; data: FilterOptions }>({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const response = await api.get('/api/communications/filter-options');
      return response.data;
    },
    initialData: { success: true, data: { types: defaultTypes, statuses: defaultStatuses } },
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
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      setIsDialogOpen(false);
      resetForm();
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
      setIsDialogOpen(false);
      resetForm();
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
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete communication');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      communication_type: 'OTHER',
      status: 'RECEIVED',
      reference_no: '',
      date_received: new Date().toISOString().split('T')[0],
    });
    setSelectedFile(null);
    setSelectedCommunication(null);
  };

  const handleOpenDialog = (communication?: Communication) => {
    if (communication) {
      setSelectedCommunication(communication);
      setFormData({
        title: communication.title,
        communication_type: communication.communication_type,
        status: communication.status,
        reference_no: communication.reference_no || '',
        date_received: communication.date_received,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const formPayload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formPayload.append(key, value);
    });
    if (selectedFile) {
      formPayload.append('file', selectedFile);
    }

    if (selectedCommunication) {
      updateMutation.mutate(formPayload);
    } else {
      createMutation.mutate(formPayload);
    }
  };

  const handleDownload = (communication: Communication) => {
    if (communication.file_path) {
      window.location.href = `/vmo-logs/api/communications/${communication.id}/public-download`;
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
          className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
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
              <Select value={typeFilter} onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
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
              <div className="border-blue-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
            </div>
          ) : communications.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 text-lg">No communications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">Title</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">Reference</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">Date</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-left">File</th>
                    <th className="px-4 py-3 font-semibold text-gray-900 text-sm text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {communications.map((comm) => (
                      <motion.tr
                        key={comm.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50 border-b transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{comm.title}</td>
                        <td className="px-4 py-3">
                          <Badge className={typeColors[comm.communication_type] || typeColors.OTHER}>
                            {comm.communication_type.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[comm.status]}>
                            {comm.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{comm.reference_no || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {new Date(comm.date_received).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {comm.file_name ? (
                            <span className="max-w-xs text-blue-600 truncate">{comm.file_name}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            {comm.file_path && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(comm)}
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(comm)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCommunication(comm);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-gray-600 text-sm">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCommunication ? 'Edit Communication' : 'New Communication'}
            </DialogTitle>
            <DialogDescription>
              {selectedCommunication
                ? 'Update communication details'
                : 'Create a new communication log entry'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Communication title"
              />
            </div>

            <div className="gap-4 grid grid-cols-2">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.communication_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, communication_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(filterOptions?.data?.statuses || defaultStatuses).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <div>
                <Label htmlFor="reference">Reference No.</Label>
                <Input
                  id="reference"
                  value={formData.reference_no}
                  onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                  placeholder="e.g., REF-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="date">Date Received</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date_received}
                  onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="file">Attachment</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && <p className="mt-1 text-gray-600 text-sm">{selectedFile.name}</p>}
              {selectedCommunication?.file_name && !selectedFile && (
                <p className="mt-1 text-gray-600 text-sm">Current: {selectedCommunication.file_name}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Communication?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCommunication?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCommunication && deleteMutation.mutate(selectedCommunication.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}