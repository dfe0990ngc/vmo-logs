import { memo, useState } from 'react';
import {
  Download,
  Edit,
  Eye,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Communication } from '@/features/communications/communications.types';
import { triggerCommunicationPublicDownload } from '@/features/communications/communications.api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number | null): string => {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STATUS_VARIANTS: Record<string, string> = {
  RECEIVED:  'bg-blue-100 text-blue-700 border-blue-200',
  RELEASED:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  PULLED_OUT:'bg-amber-100 text-amber-700 border-amber-200',
};

const getStatusClass = (status: string) =>
  STATUS_VARIANTS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';

const formatCommType = (type: string) => type.replace(/_/g, ' ');

// ─── Row ─────────────────────────────────────────────────────────────────────

interface DataTableRowProps {
  communication: Communication;
  onEdit:   (c: Communication) => void;
  onDelete: (c: Communication) => void;
  onView:   (c: Communication) => void;
}

const DataTableRow = memo(({ communication: comm, onEdit, onDelete, onView }: DataTableRowProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!comm.file_path) return;
    setIsLoading(true);
    try {
      await triggerCommunicationPublicDownload(Number(comm.id));
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canModify = user && (user.user_type === 'Admin' || user.user_type === 'Staff');

  return (
    <TableRow className="sm:table-row flex flex-col shadow-sm mb-3 sm:mb-0 py-3 sm:py-0 border border-gray-200 sm:border-gray-100 sm:border-b rounded-lg sm:rounded-none">
      {/* Title */}
      <TableCell className="max-w-80">
        <div className="flex items-start gap-2">
          <FileText className="flex-shrink-0 mt-0.5 w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm sm:truncate whitespace-normal" title={comm.title}>
              {comm.title}
            </div>
            {comm.reference_no && (
              <div className="text-muted-foreground text-xs">{comm.reference_no}</div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell>
        <em className="sm:hidden inline-block">Type:&nbsp;</em>
        <Badge variant="secondary" className="text-xs capitalize">
          {formatCommType(comm.communication_type)}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <em className="sm:hidden inline-block">Status:&nbsp;</em>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(comm.status)}`}>
          {comm.status.replace(/_/g, ' ')}
        </span>
      </TableCell>

      {/* Date Received */}
      <TableCell className="text-muted-foreground text-sm">
        <em className="sm:hidden inline-block">Date Received:&nbsp;</em>
        {formatDate(comm.date_received)}
      </TableCell>

      {/* File Size */}
      <TableCell className="text-muted-foreground text-sm">
        <em className="sm:hidden inline-block">File Size:&nbsp;</em>
        {formatFileSize(comm.file_size)}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex gap-1">
          {comm.file_path && (
            <Button
              variant="secondary"
              size="sm"
              className="p-0 w-8 h-8"
              onClick={handleDownload}
              title="Download PDF"
              disabled={isLoading}
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="p-0 w-8 h-8"
            onClick={() => onView(comm)}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>

          {canModify && (
            <Button
              variant="outline"
              size="sm"
              className="p-0 w-8 h-8"
              onClick={() => onEdit(comm)}
              title="Edit Communication"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}

          {user?.user_type === 'Admin' && (
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-red-50 p-0 w-8 h-8 text-red-600 hover:text-red-700"
              onClick={() => onDelete(comm)}
              title="Delete Communication"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

DataTableRow.displayName = 'DataTableRow';

// ─── Table ───────────────────────────────────────────────────────────────────

interface TableProps {
  communications: Communication[];
  onEdit:   (c: Communication) => void;
  onDelete: (c: Communication) => void;
  onView:   (c: Communication) => void;
}

const DataTable = memo(({ communications, onEdit, onDelete, onView }: TableProps) => (
  <div className="sm:border border-0 sm:rounded-md overflow-hidden">
    <Table>
      <TableHeader className="hidden sm:table-header-group">
        <TableRow>
          <TableHead>Title / Reference</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date Received</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&_tr:last-child]:border">
        {communications.map((comm) => (
          <DataTableRow
            key={comm.id}
            communication={comm}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </TableBody>
    </Table>
  </div>
));

DataTable.displayName = 'DataTable';

export default DataTable;