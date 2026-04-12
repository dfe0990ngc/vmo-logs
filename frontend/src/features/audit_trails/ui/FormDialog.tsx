import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AuditTrail } from "../audit_trails.types";
import { 
  Calendar, 
  User, 
  Monitor, 
  MapPin, 
  FileText,
  Database,
  Hash
} from "lucide-react";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  auditTrail: AuditTrail | null;
  getActionColor: (action: string) => string;
}

const FormDialog = memo(
  ({ open, onClose, auditTrail, getActionColor }: FormDialogProps) => {
    if (!auditTrail) return null;

    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } catch {
        return dateString;
      }
    };

    const renderJsonDiff = (oldValues: any, newValues: any) => {
      if (!oldValues && !newValues) return null;

      const allKeys = new Set([
        ...Object.keys(oldValues || {}),
        ...Object.keys(newValues || {}),
      ]);

      const changes: Array<{ key: string; old: any; new: any; changed: boolean }> = [];
      
      allKeys.forEach((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        changes.push({ key, old: oldVal, new: newVal, changed });
      });

      return (
        <div className="space-y-3">
          {changes.map(({ key, old: oldVal, new: newVal, changed }) => (
            <div
              key={key}
              className={`border rounded-lg p-3 ${
                changed ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm capitalize">
                  {key.replace(/_/g, " ")}
                </span>
                {changed && (
                  <Badge className="bg-yellow-500 text-white text-xs">
                    Changed
                  </Badge>
                )}
              </div>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                {oldVal !== undefined && (
                  <div>
                    <div className="mb-1 font-medium text-muted-foreground text-xs">
                      Old Value
                    </div>
                    <div className="bg-white p-2 border rounded text-sm">
                      {typeof oldVal === "object"
                        ? JSON.stringify(oldVal, null, 2)
                        : String(oldVal || "—")}
                    </div>
                  </div>
                )}
                {newVal !== undefined && (
                  <div>
                    <div className="mb-1 font-medium text-muted-foreground text-xs">
                      New Value
                    </div>
                    <div className="bg-white p-2 border rounded text-sm">
                      {typeof newVal === "object"
                        ? JSON.stringify(newVal, null, 2)
                        : String(newVal || "—")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="flex flex-col p-3 sm:p-6 sm:max-w-4xl max-h-[90vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-4 border-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Trail Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about this system activity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {/* Header Info */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="mt-1 w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                    User
                  </div>
                  <div className="font-semibold">{auditTrail.user_name}</div>
                  <div className="text-muted-foreground text-sm">
                    {auditTrail.user_type}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="mt-1 w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                    Action
                  </div>
                  <Badge className={`${getActionColor(auditTrail.action)} font-medium text-sm`}>
                    {auditTrail.action}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Database className="mt-1 w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                    Entity Type
                  </div>
                  <div className="font-semibold capitalize">
                    {auditTrail.entity_type}
                  </div>
                  {auditTrail.entity_id && (
                    <div className="text-muted-foreground text-sm">
                      ID: {auditTrail.entity_id}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-1 w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">
                    Date & Time
                  </div>
                  <div className="text-sm">
                    {formatDate(auditTrail.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Entity Name */}
            {auditTrail.entity_name && (
              <div className="bg-gray-50 p-4 border rounded-lg">
                <div className="mb-2 font-medium text-muted-foreground text-xs uppercase">
                  Entity Name
                </div>
                <div className="font-semibold">{auditTrail.entity_name}</div>
              </div>
            )}

            {/* Description */}
            {auditTrail.description && (
              <div className="bg-gray-50 p-4 border rounded-lg">
                <div className="mb-2 font-medium text-muted-foreground text-xs uppercase">
                  Description
                </div>
                <div>{auditTrail.description}</div>
              </div>
            )}

            {/* Changes */}
            {(auditTrail.old_values || auditTrail.new_values) && (
              <div>
                <div className="mb-3 font-medium text-muted-foreground text-xs uppercase">
                  Changes
                </div>
                {renderJsonDiff(auditTrail.old_values, auditTrail.new_values)}
              </div>
            )}

            {/* Technical Details */}
            <div className="space-y-3">
              <div className="font-medium text-muted-foreground text-xs uppercase">
                Technical Details
              </div>
              
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                {auditTrail.ip_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="mb-1 font-medium text-muted-foreground text-xs">
                        IP Address
                      </div>
                      <div className="font-mono text-sm">
                        {auditTrail.ip_address}
                      </div>
                    </div>
                  </div>
                )}

                {auditTrail.user_agent && (
                  <div className="flex items-start gap-3">
                    <Monitor className="mt-1 w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="mb-1 font-medium text-muted-foreground text-xs">
                        User Agent
                      </div>
                      <div className="text-sm break-words whitespace-pre-wrap" title={auditTrail.user_agent}>
                        {auditTrail.user_agent}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

export default FormDialog;
