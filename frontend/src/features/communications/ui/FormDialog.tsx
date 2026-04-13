import { useEffect, useState, memo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Communication,
  CommunicationType,
  CommunicationStatus,
} from "@/features/communications/communications.types";
import { FileText, Loader2, Upload, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  communication_type: CommunicationType;
  status: CommunicationStatus;
  reference_no: string;
  date_received: string;
  file: File | null;
}

const DEFAULT_FORM: FormState = {
  title: "",
  communication_type: "OTHER",
  status: "RECEIVED",
  reference_no: "",
  date_received: "",
  file: null,
};

const COMM_TYPES: { value: CommunicationType; label: string }[] = [
  { value: "MTOP",              label: "MTOP" },
  { value: "TRAVEL_ORDER",      label: "Travel Order" },
  { value: "SB_RESOLUTION",     label: "SB Resolution" },
  { value: "SB_ORDINANCE",      label: "SB Ordinance" },
  { value: "APPLICATION_LEAVE", label: "Application Leave" },
  { value: "MEMO",              label: "Memo" },
  { value: "NOTICE_HEARING",    label: "Notice of Hearing" },
  { value: "INVITATION",        label: "Invitation" },
  { value: "ENDORSEMENT",       label: "Endorsement" },
  { value: "DSSC",              label: "DSSC" },
  { value: "MADAC",             label: "MADAC" },
  { value: "DOE",               label: "DOE" },
  { value: "SOLICITATION",      label: "Solicitation" },
  { value: "TENT_REQUEST",      label: "Tent Request" },
  { value: "OTHER",             label: "Other" },
];

const STATUSES: { value: CommunicationStatus; label: string }[] = [
  { value: "RECEIVED",   label: "Received" },
  { value: "RELEASED",   label: "Released" },
  { value: "COMPLETED",  label: "Completed" },
  { value: "PULLED_OUT", label: "Pulled Out" },
];

// ─── Internal hook ────────────────────────────────────────────────────────────

function useForm(
  communication: Communication | null,
  mode: "create" | "edit" | "view"
) {
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (communication && (mode === "edit" || mode === "view")) {
      setFormData({
        title:              communication.title,
        communication_type: communication.communication_type,
        status:             communication.status,
        reference_no:       communication.reference_no ?? "",
        date_received:      communication.date_received ?? "",
        file:               null,
      });
    } else if (mode === "create") {
      setFormData({ ...DEFAULT_FORM });
    }
  }, [communication, mode]);

  const handleChange = (
    field: keyof FormState,
    value: string | File | null,
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return { formData, handleChange };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  communication: Communication | null;
  mode: "create" | "edit" | "view";
  isSaving?: boolean;
}

const FormDialog = memo(
  ({ open, onClose, onSave, communication, mode, isSaving }: FormDialogProps) => {
    const { formData, handleChange: handleFormChange } = useForm(communication, mode);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedFileName, setSelectedFileName] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetFormUI = () => {
      setSelectedFileName("");
      setIsDragging(false);
      setErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleChange = (field: keyof FormState, value: string | File | null) => {
      handleFormChange(field, value, setErrors);
    };

    const validateAndSetFile = (file: File) => {
      if (file.type !== "application/pdf") {
        setErrors((prev) => ({ ...prev, file: "Only PDF files are allowed" }));
        setSelectedFileName("");
        handleChange("file", null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, file: "File size must not exceed 50MB" }));
        setSelectedFileName("");
        handleChange("file", null);
        return;
      }
      setSelectedFileName(file.name);
      handleChange("file", file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSetFile(file);
    };

    const handleDragEnter  = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave  = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver   = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop       = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndSetFile(file);
    };

    const clearFile = () => {
      setSelectedFileName("");
      handleChange("file", null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.title.trim())          newErrors.title              = "Title is required";
      if (!formData.communication_type)    newErrors.communication_type = "Communication type is required";
      if (mode === "create" && !formData.file) newErrors.file           = "PDF file is required";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
      if (!validate()) return;

      const submitData = new FormData();
      if (formData.file) submitData.append("file", formData.file);
      submitData.append("title",              formData.title.trim());
      submitData.append("communication_type", formData.communication_type);
      submitData.append("status",             formData.status);
      if (formData.reference_no.trim()) submitData.append("reference_no", formData.reference_no.trim());
      if (formData.date_received) {
        // Convert datetime-local format (YYYY-MM-DDTHH:mm) to Y-m-d H:i:s
        const dateTime = formData.date_received.replace("T", " ") + ":00";
        submitData.append("date_received", dateTime);
      }

      await onSave(submitData as any);
      resetFormUI();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="flex flex-col p-3 sm:p-6 sm:max-w-2xl max-h-[90vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-2 border-0 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {mode === "create"
                ? "Add New Communication"
                : mode === "edit"
                ? "Edit Communication"
                : "Communication Details"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Log a new communication record."
                : mode === "edit"
                ? "Update communication details or replace the attached PDF."
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">
                PDF File {mode === "create" && <span className="text-red-500">*</span>}
              </Label>

              {!selectedFileName && mode !== "view" ? (
                <div
                  className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${
                    isDragging ? "border-[#008ea2] bg-[#008ea2]/5" : "border-gray-300 hover:border-[#008ea2]"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className={`mx-auto mb-4 w-10 h-10 transition-colors ${isDragging ? "text-[#008ea2]" : "text-gray-400"}`} />
                  <p className="mb-1 text-gray-600 text-sm">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-gray-500 text-xs">PDF only (Max 50MB)</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 p-4 border rounded-lg">
                  <FileText className="flex-shrink-0 w-8 h-8 text-[#008ea2]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedFileName}</p>
                    <p className="text-gray-500 text-xs">
                      {formData.file ? (formData.file.size / (1024 * 1024)).toFixed(2) + " MB" : ""}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" disabled={mode === "view"} onClick={clearFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {errors.file && <p className="text-red-500 text-sm">{errors.file}</p>}

              {(mode === "edit" || mode === "view") && !selectedFileName && communication?.file_path && (
                <p className="text-gray-500 text-xs">
                  Current file: {communication.file_path.split("/").pop()}
                  {communication.file_size
                    ? ` (${(communication.file_size / (1024 * 1024)).toFixed(2)} MB)`
                    : ""}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="title"
                value={formData.title}
                readOnly={mode === "view"}
                placeholder="Enter communication title"
                rows={2}
                className={`resize-y min-h-10 transition-all ${errors.title ? "border-red-500" : ""}`}
                onChange={(e) => handleChange("title", e.target.value)}
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            </div>

            <div className="gap-4 grid grid-cols-2">
              {/* Communication Type */}
              <div className="space-y-2">
                <Label htmlFor="communication_type">
                  Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.communication_type}
                  disabled={mode === "view"}
                  onValueChange={(v) => handleChange("communication_type", v)}
                >
                  <SelectTrigger className={errors.communication_type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMM_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.communication_type && (
                  <p className="text-red-500 text-sm">{errors.communication_type}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  disabled={mode === "view"}
                  onValueChange={(v) => handleChange("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gap-4 grid grid-cols-2">
              {/* Reference No */}
              <div className="space-y-2">
                <Label htmlFor="reference_no">Reference No.</Label>
                <Input
                  id="reference_no"
                  readOnly={mode === "view"}
                  placeholder="e.g., REF-2024-001"
                  value={formData.reference_no}
                  onChange={(e) => handleChange("reference_no", e.target.value)}
                />
              </div>

              {/* Date Received */}
              <div className="space-y-2">
                <Label htmlFor="date_received">Date & Time Received</Label>
                <Input
                  id="date_received"
                  type="datetime-local"
                  readOnly={mode === "view"}
                  value={formData.date_received}
                  onChange={(e) => handleChange("date_received", e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-0 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === "view" ? "Close" : "Cancel"}
            </Button>
            {mode !== "view" && (
              <Button
                type="button"
                onClick={handleSubmit}
                className="bg-[#008ea2] hover:bg-[#007a8b]"
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {mode === "create" ? "Add Communication" : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

FormDialog.displayName = "FormDialog";

export default FormDialog;