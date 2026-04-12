import { memo } from "react";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditTrail } from "../audit_trails.types";
import { formatDistanceToNow } from "date-fns";

interface DataTableProps {
  auditTrails: AuditTrail[];
  onViewDetails: (auditTrail: AuditTrail) => void;
  getActionColor: (action: string) => string;
}

const DataTableRow = memo(
  ({
    auditTrail,
    onViewDetails,
    getActionColor,
  }: {
    auditTrail: AuditTrail;
    onViewDetails: (auditTrail: AuditTrail) => void;
    getActionColor: (action: string) => string;
  }) => {
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return {
          absolute: date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          relative: formatDistanceToNow(date, { addSuffix: true }),
        };
      } catch {
        return { absolute: dateString, relative: "" };
      }
    };

    const dateFormatted = formatDate(auditTrail.created_at);

    return (
      <TableRow key={auditTrail.id} className="sm:table-row flex-1 grid shadow-sm mb-3 sm:mb-0 py-3 sm:py-0 border border-gray-200 sm:border-gray-100 sm:border-b rounded-lg sm:rounded-none">
        <TableCell>
          <em className="sm:hidden inline-block">User & Type:&nbsp;</em>
          <div className="flex flex-col">
            <span className="font-medium whitespace-pre-line">{auditTrail.user_name}</span>
            <span className="text-muted-foreground text-xs">
              {auditTrail.user_type}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <em className="sm:hidden inline-block">Action Type:&nbsp;</em>
          <Badge className={`${getActionColor(auditTrail.action)} font-medium`}>
            {auditTrail.action}
          </Badge>
        </TableCell>
        <TableCell className="max-w-[250px]">
          <em className="sm:hidden inline-block">Entity Type & Name:&nbsp;</em>
          <div className="flex flex-col">
            <span className="font-medium capitalize whitespace-pre-line">
              {auditTrail.entity_type}
            </span>
            {auditTrail.entity_name && (
              <span className="text-muted-foreground text-xs whitespace-pre-line">
                {auditTrail.entity_name}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-[320px]">
          <em className="sm:hidden inline-block">Description:&nbsp;</em>
          <div className="max-w-xs whitespace-pre-line" title={auditTrail.description || ""}>
            {auditTrail.description || (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <em className="sm:hidden inline-block">Log Date & Time:&nbsp;</em>
          <div className="flex flex-col">
            <span className="text-sm">{dateFormatted.absolute}</span>
            <span className="text-muted-foreground text-xs">
              {dateFormatted.relative}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Button
            variant="secondary"
            size="sm"
            className="p-0 w-8 h-8"
            onClick={() => onViewDetails(auditTrail)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }
);

const DataTable = memo(
  ({ auditTrails, onViewDetails, getActionColor }: DataTableProps) => {
    return (
      <div className="sm:border border-0 sm:rounded-md overflow-hidden">
        <Table>
          <TableHeader className="hidden sm:table-header-group">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="w-[80px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border">
            {auditTrails.map((auditTrail) => (
              <DataTableRow
                key={auditTrail.id}
                auditTrail={auditTrail}
                onViewDetails={onViewDetails}
                getActionColor={getActionColor}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
);

export default DataTable;
