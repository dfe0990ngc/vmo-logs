import { memo, forwardRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Communication } from "@/features/communications/communications.types";
import { FileText, Loader2 } from "lucide-react";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  communication: Communication | null;
  onConfirm: () => void;
  isSaving?: boolean;
}

const DeleteDialog = memo(
  forwardRef<HTMLDivElement, DeleteDialogProps>(
    ({ open, onClose, communication, onConfirm, isSaving }, _ref) => {
      if (!communication) return null;

      return (
        <AlertDialog open={open} onOpenChange={onClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Delete Communication?
              </AlertDialogTitle>

              <AlertDialogDescription className="space-y-2">
                <p>
                  This will permanently delete{" "}
                  <strong className="text-foreground">
                    &ldquo;{communication.title}&rdquo;
                  </strong>
                  {communication.reference_no && (
                    <span className="text-muted-foreground">
                      {" "}({communication.reference_no})
                    </span>
                  )}
                  .
                </p>

                {communication.file_path && (
                  <p className="font-medium text-red-600">
                    ⚠️ This will also delete the attached PDF file from the
                    server. This action cannot be undone.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>

              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                Delete Communication
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
  )
);

DeleteDialog.displayName = "DeleteDialog";

export default DeleteDialog;